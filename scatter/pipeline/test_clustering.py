import unittest
import json
import pandas as pd
from steps.clustering import clustering
import os

class TestClustering(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        with open('configs/example-polis.json', 'r') as f:
            self.config = json.load(f)
        
        # Run clustering if output doesn't exist
        output_path = f'outputs/{self.config["input"]}/clusters.csv'
        if not os.path.exists(output_path):
            clustering(self.config)
        
        # Load clustering output
        self.df = pd.read_csv(output_path)
        
    def test_output_columns(self):
        """Test that clusters.csv has the expected columns."""
        expected_columns = ['arg-id', 'x', 'y', 'probability', 'cluster-id']
        cluster_cols = [col for col in self.df.columns if col.startswith('cluster_level_')]
        
        # Verify required columns exist
        for col in expected_columns:
            self.assertIn(col, self.df.columns, f"Required column {col} not found in clusters.csv")
            
        # Verify we have cluster level columns
        self.assertTrue(len(cluster_cols) > 0, "No cluster level columns found")
        
        # Verify cluster level columns follow expected format
        for col in cluster_cols:
            self.assertTrue(col.startswith('cluster_level_'), 
                          f"Cluster column {col} does not follow expected format")
        
    def test_cluster_counts(self):
        """Test that each cluster level has the expected number of clusters."""
        cluster_cols = [col for col in self.df.columns if col.startswith('cluster_level_')]
        target_clusters = self.config['clustering']['clusters']
        
        for col in sorted(cluster_cols):
            n_clusters = len(self.df[col].unique())
            # Level 0 should have the target number of clusters (k-means)
            if col == 'cluster_level_0':
                self.assertGreaterEqual(n_clusters, target_clusters * 0.9, 
                                     f"Too few initial clusters (expected ~{target_clusters})")
                self.assertLessEqual(n_clusters, target_clusters * 1.1, 
                                   f"Too many initial clusters (expected ~{target_clusters})")
            # Higher levels should have progressively fewer clusters
            else:
                prev_level = f'cluster_level_{int(col.split("_")[-1]) - 1}'
                prev_clusters = len(self.df[prev_level].unique())
                self.assertLess(n_clusters, prev_clusters, 
                              f"Level {col} should have fewer clusters than {prev_level}")

if __name__ == '__main__':
    unittest.main()
