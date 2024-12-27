"""Cluster the arguments using UMAP + HDBSCAN and GPT-4."""

from importlib import import_module

import numpy as np
import pandas as pd
from janome.tokenizer import Tokenizer

STOP_WORDS = [
    "の",
    "に",
    "は",
    "を",
    "た",
    "が",
    "で",
    "て",
    "と",
    "し",
    "れ",
    "さ",
    "ある",
    "いる",
    "も",
    "する",
    "から",
    "な",
    "こと",
    "として",
    "いく",
    "ない",
]
TOKENIZER = Tokenizer()


def clustering(config):
    dataset = config["output_dir"]
    path = f"outputs/{dataset}/clusters.csv"
    arguments_df = pd.read_csv(f"outputs/{dataset}/args.csv")
    arguments_array = arguments_df["argument"].values

    embeddings_df = pd.read_pickle(f"outputs/{dataset}/embeddings.pkl")
    embeddings_array = np.asarray(embeddings_df["embedding"].values.tolist())
    clusters = config["clustering"]["clusters"]

    # Always start with 100 clusters and merge down
    result = cluster_embeddings(
        docs=arguments_array,
        embeddings=embeddings_array,
        metadatas={
            "arg-id": arguments_df["arg-id"].values,
            "comment-id": arguments_df["comment-id"].values,
        },
        min_cluster_size=8,  # Minimum cluster size
        n_topics=clusters,  # Desired final cluster count
    )
    
    # Save all granularity levels to CSV
    result.to_csv(path, index=False)


def tokenize_japanese(text):
    return [
        token.surface
        for token in TOKENIZER.tokenize(text)
        if token.surface not in STOP_WORDS
    ]


def compute_cluster_distance(cluster1_docs, cluster2_docs):
    """Compute a preliminary distance score between two clusters.
    This is a placeholder implementation that can be enhanced with LLM-based scoring later.
    """
    # For now, use a simple heuristic based on the number of common words
    words1 = set(" ".join(cluster1_docs).split())
    words2 = set(" ".join(cluster2_docs).split())
    common_words = len(words1.intersection(words2))
    total_words = len(words1.union(words2))
    return 1.0 - (common_words / total_words if total_words > 0 else 0)

def merge_adjacent_clusters(cluster_labels, adjacency, docs):
    """Merge adjacent clusters based on their similarity, storing intermediate states.
    Returns a dictionary mapping number of clusters to their corresponding labels."""
    current_labels = cluster_labels.copy()
    n_current_clusters = len(set(current_labels))
    
    # Store all granularity levels (8-100)
    granularity_labels = {}
    
    # Create a mapping of cluster IDs to their documents
    cluster_docs = {}
    for doc_idx, cluster_id in enumerate(current_labels):
        if cluster_id not in cluster_docs:
            cluster_docs[cluster_id] = []
        cluster_docs[cluster_id].append(docs[doc_idx])
    
    # Store initial state (100 clusters)
    granularity_labels[n_current_clusters] = current_labels.copy()
    
    # While we have more than 8 clusters
    while n_current_clusters > 8:
        # Find the most similar adjacent clusters
        min_distance = float('inf')
        clusters_to_merge = None
        
        for c1, c2 in adjacency:
            # Skip if either cluster no longer exists (was merged)
            if c1 not in cluster_docs or c2 not in cluster_docs:
                continue
                
            distance = compute_cluster_distance(cluster_docs[c1], cluster_docs[c2])
            if distance < min_distance:
                min_distance = distance
                clusters_to_merge = (c1, c2)
        
        if clusters_to_merge is None:
            break
            
        # Merge the clusters
        c1, c2 = clusters_to_merge
        # Merge documents
        cluster_docs[c1].extend(cluster_docs[c2])
        del cluster_docs[c2]
        # Update labels
        current_labels[current_labels == c2] = c1
        n_current_clusters -= 1
        
        # Store the current state if it's within our target range (8-100)
        if 8 <= n_current_clusters <= 100:
            granularity_labels[n_current_clusters] = current_labels.copy()
    
    return granularity_labels

def cluster_embeddings(
    docs,
    embeddings,
    metadatas,
    min_cluster_size=2,
    n_components=2,
    n_topics=6,
):
    # (!) we import the following modules dynamically for a reason
    # (they are slow to load and not required for all pipelines)
    KMeans = import_module("sklearn.cluster").KMeans
    HDBSCAN = import_module("hdbscan").HDBSCAN
    UMAP = import_module("umap").UMAP
    CountVectorizer = import_module("sklearn.feature_extraction.text").CountVectorizer
    BERTopic = import_module("bertopic").BERTopic
    Voronoi = import_module("scipy.spatial").Voronoi

    umap_model = UMAP(
        random_state=42,
        n_components=n_components,
    )
    hdbscan_model = HDBSCAN(min_cluster_size=min_cluster_size)

    vectorizer_model = CountVectorizer(tokenizer=tokenize_japanese)
    topic_model = BERTopic(
        umap_model=umap_model,
        hdbscan_model=hdbscan_model,
        vectorizer_model=vectorizer_model,
        verbose=True,
    )

    # Fit the topic model.
    _, __ = topic_model.fit_transform(docs, embeddings=embeddings)

    # Transform embeddings to 2D using UMAP
    umap_embeds = umap_model.fit_transform(embeddings)
    
    # Use k-means for initial clustering (100 clusters by default)
    kmeans_model = KMeans(
        n_clusters=100,  # Default to 100 clusters as requested
        random_state=42,
        n_init="auto"  # Use the new recommended default
    )
    cluster_labels = kmeans_model.fit_predict(umap_embeds)
    
    # Compute Voronoi diagram from cluster centers to find adjacent clusters
    vor = Voronoi(kmeans_model.cluster_centers_)
    adjacency = set()
    for simplex in vor.ridge_points:
        adjacency.add(tuple(sorted(simplex)))
    
    # Get all granularity levels from 100 down to 8
    granularity_labels = merge_adjacent_clusters(cluster_labels, adjacency, docs)

    # Create base result DataFrame
    result = topic_model.get_document_info(
        docs=docs,
        metadata={
            **metadatas,
            "x": umap_embeds[:, 0],
            "y": umap_embeds[:, 1],
        },
    )

    result.columns = [c.lower() for c in result.columns]
    result = result[["arg-id", "x", "y", "probability"]]
    
    # Add columns for each granularity level
    for n_clusters, labels in granularity_labels.items():
        result[f"cluster_level_{n_clusters}"] = labels
    
    # Set the requested number of clusters as the default cluster-id
    result["cluster-id"] = granularity_labels.get(n_topics, granularity_labels[min(n_topics, max(granularity_labels.keys()))])

    return result
