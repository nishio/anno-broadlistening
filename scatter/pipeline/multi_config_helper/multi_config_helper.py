import json
import os
from typing import List, Dict, Any, Optional

# デフォルトのテンプレート設定
DEFAULT_EXTRACTION = {
    "workers": 3,
    "limit": 20,
    "model": "gpt-3.5-turbo",
    "properties": ["source", "age"],
    "prompt": "以下のコメントから、主張や意見を抽出してください。",
    "categories": {
        "genre": {
            "politics": "政治に関する意見（政策、制度、法律など）",
            "economy": "経済に関する意見（財政、金融、産業など）",
            "society": "社会に関する意見（教育、福祉、文化など）",
            "environment": "環境に関する意見（気候変動、エネルギー、自然保護など）"
        },
        "sentiment": {
            "positive": "前向きで建設的な意見",
            "negative": "批判的や懸念を示す意見",
            "neutral": "中立的な意見や事実の指摘"
        }
    }
}

DEFAULT_CLUSTERING = {
    "clusters": 5,
    "min_cluster_size": 3,
    "embedding": {
        "model": "text-embedding-ada-002",
        "batch_size": 32
    }
}

DEFAULT_AGGREGATION = {
    "hidden_properties": {
        "age": [20, 30, 40, 50],
        "source": ["Google Form", "X API"]
    },
    "summary_length": "medium"
}


def generate_configs(
    project_name: str,
    survey_definitions: List[Dict[str, Any]],
    output_dir: str = "configs"
) -> None:
    """複数のアンケート設定からconfigファイルを生成するヘルパー関数

    Args:
        project_name (str): プロジェクトの名前。生成されるconfig fileの接頭辞として使用
        survey_definitions (List[Dict[str, Any]]): アンケート設定のリスト
            例: [
                {
                    "name": "日本の未来",
                    "input": "dummy-comments-japan",
                    "question": "日本の未来に対して…",
                    "model": "gpt-xyz",
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
                # 他のアンケート設定...
            ]
        output_dir (str, optional): 生成したconfigファイルの出力先ディレクトリ. Defaults to "configs".

    Note:
        - 各アンケート設定に必須のフィールド:
            - name: アンケートの名前
            - input: 入力データファイル名（.csvは不要）
            - question: アンケートの質問
        - オプションのフィールド:
            - model: 使用するLLMモデル（デフォルト: gpt-3.5-turbo）
            - extraction: データ抽出の設定
            - clustering: クラスタリングの設定
            - aggregation: データ集計の設定
    """
    # 出力ディレクトリが存在しない場合は作成
    os.makedirs(output_dir, exist_ok=True)

    for survey in survey_definitions:
        # 必須フィールドの検証
        required_fields = ["name", "input", "question"]
        missing_fields = [field for field in required_fields if field not in survey]
        if missing_fields:
            raise ValueError(
                f"必須フィールドが不足しています: {', '.join(missing_fields)}"
            )

        # configデータの作成
        config_data = {
            "name": survey["name"],
            "question": survey["question"],
            "input": survey["input"],
            "model": survey.get("model", DEFAULT_EXTRACTION["model"]),
            "extraction": {
                **DEFAULT_EXTRACTION,
                **survey.get("extraction", {}),
            },
            "clustering": {
                **DEFAULT_CLUSTERING,
                **survey.get("clustering", {}),
            },
            "aggregation": {
                **DEFAULT_AGGREGATION,
                **survey.get("aggregation", {}),
            },
        }

        # intro フィールドがある場合は追加
        if "intro" in survey:
            config_data["intro"] = survey["intro"]

        # configファイルの生成
        filename = f"{output_dir}/{project_name}_{config_data['name']}.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(config_data, f, ensure_ascii=False, indent=2)
            print(f"Created {filename}")


if __name__ == "__main__":
    # 使用例
    survey_defs = [
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
        }
    ]
    generate_configs("myproject", survey_defs)
