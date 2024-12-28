# Multi Config Helper

複数のアンケート結果を一つのプロジェクトとして管理するためのヘルパースクリプトです。

## 使い方

### 基本的な使用方法

```python
from multi_config_helper import generate_configs

# アンケート設定の定義
survey_definitions = [
    {
        "name": "日本の未来",
        "input": "dummy-comments-japan",
        "question": "日本の未来に対して、あなたの意見を教えてください。",
        "model": "gpt-3.5-turbo",
        "extraction": {
            "workers": 3,
            "limit": 20,
            "properties": ["source", "age"],
            "categories": {
                "genre": {
                    "politics": "政治に関する意見",
                    "economy": "経済に関する意見"
                }
            }
        }
    },
    {
        "name": "環境問題",
        "input": "environment-survey",
        "question": "環境問題について、あなたの意見を教えてください。",
        "extraction": {
            "categories": {
                "sentiment": {
                    "positive": "前向きで建設的な意見",
                    "negative": "批判的や懸念を示す意見",
                    "neutral": "中立的な意見や事実の指摘"
                }
            }
        }
    }
]

# configファイルの生成
generate_configs("myproject", survey_definitions)
```

### 生成されたconfigファイルの実行

```bash
python main.py configs/myproject_日本の未来.json
python main.py configs/myproject_環境問題.json
```

## 設定項目

### 必須フィールド

- `name`: アンケートの名前
- `input`: 入力データファイル名（.csvは不要）
- `question`: アンケートの質問

### オプションフィールド

- `model`: 使用するLLMモデル（デフォルト: gpt-3.5-turbo）
- `extraction`: データ抽出の設定
  - `workers`: 並列処理のワーカー数（デフォルト: 3）
  - `limit`: 処理するデータ数の上限（デフォルト: 20）
  - `properties`: 追加のプロパティ（デフォルト: ["source", "age"]）
  - `categories`: カテゴリ分類の定義
- `clustering`: クラスタリングの設定
  - `clusters`: クラスタ数（デフォルト: 5）
  - `min_cluster_size`: 最小クラスタサイズ（デフォルト: 3）
  - `embedding`: 埋め込みモデルの設定
- `aggregation`: データ集計の設定
  - `hidden_properties`: 非表示プロパティの設定
  - `summary_length`: サマリーの長さ（デフォルト: "medium"）

## デフォルト設定

各設定項目のデフォルト値は `multi_config_helper.py` の `DEFAULT_EXTRACTION`, `DEFAULT_CLUSTERING`, `DEFAULT_AGGREGATION` で定義されています。

## 注意事項

- 入力データ（CSVファイル）は `inputs/` ディレクトリに配置してください
- 生成されたconfigファイルは `configs/` ディレクトリに保存されます
- 必須フィールドが不足している場合はエラーが発生します
