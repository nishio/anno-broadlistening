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

    result = cluster_embeddings(
        docs=arguments_array,
        embeddings=embeddings_array,
        metadatas={
            "arg-id": arguments_df["arg-id"].values,
            "comment-id": arguments_df["comment-id"].values,
        },
        min_cluster_size=clusters,
        n_topics=clusters,
    )
    result.to_csv(path, index=False)


def tokenize_japanese(text):
    return [
        token.surface
        for token in TOKENIZER.tokenize(text)
        if token.surface not in STOP_WORDS
    ]


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
    result["cluster-id"] = cluster_labels

    return result
