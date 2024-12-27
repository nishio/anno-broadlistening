from steps.clustering import clustering
import json
import pandas as pd

def test_clustering_output():
    # Load config
    with open('configs/example-polis.json', 'r') as f:
        config = json.load(f)
    
    # Run clustering
    clustering(config)
    
    # Verify output format
    df = pd.read_csv(f'outputs/{config["output_dir"]}/clusters.csv')
    print('\nColumns in clusters.csv:')
    print(df.columns.tolist())
    
    print('\nNumber of unique clusters in each level:')
    cluster_cols = [col for col in df.columns if col.startswith('cluster_level_')]
    for col in sorted(cluster_cols):
        n_clusters = len(df[col].unique())
        print(f'{col}: {n_clusters} clusters')

if __name__ == '__main__':
    test_clustering_output()
