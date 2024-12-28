"""Generate a convenient JSON output file."""

import json
from collections import defaultdict
from pathlib import Path

import pandas as pd

ROOT_DIR = Path(__file__).parent.parent.parent.parent
CONFIG_DIR = ROOT_DIR / "scatter" / "pipeline" / "configs"


def create_custom_intro(config, total_sampled_num: int):
    dataset = config["output_dir"]
    args_path = f"outputs/{dataset}/args.csv"
    comments = pd.read_csv(f"inputs/{config['input']}.csv")
    result_path = f"outputs/{dataset}/result.json"

    input_count = len(comments)
    args_count = len(pd.read_csv(args_path))
    processed_num = min(input_count, config["extraction"]["limit"])

    print(f"Input count: {input_count}")
    print(f"Args count: {args_count}")

    base_custom_intro = """{intro}
分析対象となったデータの件数は{processed_num}件で、これらのデータに対してOpenAI APIを用いて{args_count}件の意見（議論）を抽出し、クラスタリングを行った。
"""

    intro = config["intro"]
    custom_intro = base_custom_intro.format(
        intro=intro, processed_num=processed_num, args_count=args_count
    )

    if total_sampled_num < args_count:
        extra_intro = "なお、クラスタ分析には前述の{args_count}件のデータを用いているが、本ページではそのうち{total_sampled_num}件のデータをサンプリングして可視化している。".format(
            args_count=args_count, total_sampled_num=total_sampled_num
        )
        custom_intro += extra_intro
    custom_intro += (
        "一部、AIによる分析結果の中で、事実と異なる内容については削除を行った。"
    )
    with open(result_path, "r") as f:
        result = json.load(f)
    result["config"]["intro"] = custom_intro
    with open(result_path, "w") as f:
        json.dump(result, f, indent=2)


def _build_property_map(
    arguments: pd.DataFrame, property_columns: list[str]
) -> dict[str, dict[str, str]]:
    property_map = defaultdict(dict)

    # 指定された property_columns が arguments に存在するかチェック
    missing_cols = [col for col in property_columns if col not in arguments.columns]
    if missing_cols:
        raise ValueError(
            f"指定されたカラム {missing_cols} が args.csv に存在しません。"
            "設定ファイルaggregation / hidden_propertiesから該当カラムを取り除いてください。"
        )

    for prop in property_columns:
        for arg_id, row in arguments.iterrows():
            # LLMによるcategory classificationがうまく行かず、NaNの場合はNoneにする
            property_map[prop][arg_id] = row[prop] if not pd.isna(row[prop]) else None
    return property_map


def aggregation(config):
    path = f"outputs/{config['output_dir']}/result.json"
    total_sampling_num = config["aggregation"]["sampling_num"]
    print("total sampling num:", total_sampling_num)

    # Get desired cluster level from config, default to original clustering if not specified
    cluster_level = config.get("clustering", {}).get("clusters", 50)
    # Ensure cluster level is within valid range
    cluster_level = max(8, min(100, cluster_level))
    print(f"Using cluster level: {cluster_level}")

    results = {
        "clusters": [],
        "comments": {},
        "propertyMap": {},
        "translations": {},
        "overview": "",
        "config": config,
        "cluster_level": cluster_level,  # Add current cluster level to results
    }

    arguments = pd.read_csv(f"outputs/{config['output_dir']}/args.csv")
    arguments.set_index("arg-id", inplace=True)
    comments = pd.read_csv(f"inputs/{config['input']}.csv")
    hidden_properties_map: dict[str, list[str]] = config["aggregation"][
        "hidden_properties"
    ]

    useful_comment_ids = set(arguments["comment-id"].values)
    for _, row in comments.iterrows():
        id = row["comment-id"]
        if id in useful_comment_ids:
            res = {"comment": row["comment-body"]}
            should_skip = any(
                row[prop] in hidden_values
                for prop, hidden_values in hidden_properties_map.items()
            )
            if should_skip:
                continue
            results["comments"][str(id)] = res

    languages = list(config.get("translation", {}).get("languages", []))
    if len(languages) > 0:
        with open(f"outputs/{config['output_dir']}/translations.json") as f:
            translations = f.read()
        results["translations"] = json.loads(translations)

    # Load cluster data
    clusters = pd.read_csv(f"outputs/{config['output_dir']}/clusters.csv")
    labels = pd.read_csv(f"outputs/{config['output_dir']}/labels.csv")
    takeaways = pd.read_csv(f"outputs/{config['output_dir']}/takeaways.csv")
    takeaways.set_index("cluster-id", inplace=True)

    # Get cluster column name for desired level
    cluster_level = config.get("clustering", {}).get("clusters", 50)
    cluster_level = max(8, min(100, cluster_level))
    cluster_col = f"cluster_level_{cluster_level}"
    if cluster_col not in clusters.columns:
        print(f"Warning: {cluster_col} not found, using default cluster-id column")
        cluster_col = "cluster-id"
    
    # Update cluster IDs to use the selected level
    clusters["cluster-id"] = clusters[cluster_col]

    print("relevant clusters score")
    print(clusters.sort_values(by="probability", ascending=False).head(10))

    # Round numeric columns for display
    clusters["x"] = clusters["x"].astype(float).round(4)
    clusters["y"] = clusters["y"].astype(float).round(4)
    clusters["probability"] = clusters["probability"].astype(float).round(1)

    with open(f"outputs/{config['output_dir']}/overview.txt") as f:
        overview = f.read()
    results["overview"] = overview

    # クラスタ事に可視化するデータをサンプルする
    # 各クラスタの件数の全体での比率をもとにサンプルする
    arguments_num = len(arguments)
    sample_rate = min(total_sampling_num / arguments_num, 1)
    total_sampled_num = 0

    sampled_comment_ids = []
    # Group clusters by the selected level
    unique_clusters = clusters[cluster_col].unique()
    for cid in unique_clusters:
        # Get label for this cluster (fallback to cluster ID if no label exists)
        label_row = labels[labels["cluster-id"] == cid]
        label = label_row["label"].iloc[0] if not label_row.empty else f"Cluster {cid}"
        arg_rows = clusters[clusters[cluster_col] == cid]
        c_arg_num = len(arg_rows)
        sampling_num = int(c_arg_num * sample_rate)

        if (
            not config["aggregation"]["include_minor"]
            and sampling_num / total_sampling_num < 0.005
        ):
            continue
        print(f"sampling num: {sampling_num}", c_arg_num, sample_rate)
        total_sampled_num += sampling_num
        arguments_in_cluster = []

        # pickup top 5 for representative comments
        sorted_rows = arg_rows.sort_values(by="probability", ascending=False)
        top_5 = sorted_rows.head(5)
        for _, arg_row in top_5.head(sampling_num).iterrows():
            arg_id = arg_row["arg-id"]
            try:
                argument = arguments.loc[arg_id]["argument"]
                comment_id = arguments.loc[arg_id]["comment-id"]
                x = float(arg_row["x"])
                y = float(arg_row["y"])
                p = float(arg_row["probability"])
                obj = {
                    "arg_id": arg_id,
                    "argument": argument,
                    "comment_id": str(comment_id),
                    "x": x,
                    "y": y,
                    "p": p,
                }
                sampled_comment_ids.append(comment_id)
                arguments_in_cluster.append(obj)
            except:
                print("Error with arg_id:", arg_id)

        results["clusters"].append(
            {
                "cluster": label,
                "cluster_id": str(cid),
                "takeaways": takeaways.loc[cid]["takeaways"],
                "arguments": arguments_in_cluster,
            }
        )

        # random sampling
        remaining = sorted_rows.iloc[5:]
        remaining_sample_size = max(0, sampling_num - 5)
        random_sample = remaining.sample(
            n=min(remaining_sample_size, len(remaining)), random_state=42
        )

        for _, arg_row in random_sample.iterrows():
            arg_id = arg_row["arg-id"]
            try:
                argument = arguments.loc[arg_id]["argument"]
                comment_id = arguments.loc[arg_id]["comment-id"]
                x = float(arg_row["x"])
                y = float(arg_row["y"])
                p = float(arg_row["probability"])
                obj = {
                    "arg_id": arg_id,
                    "argument": argument,
                    "comment_id": str(comment_id),
                    "x": x,
                    "y": y,
                    "p": p,
                }
                sampled_comment_ids.append(comment_id)
                arguments_in_cluster.append(obj)
            except:
                print("Error with arg_id:", arg_id)

    # 属性情報のカラムは、元データに対して指定したカラムとclassificationするカテゴリを合わせたもの
    property_columns = list(hidden_properties_map.keys()) + list(
        config["extraction"]["categories"].keys()
    )
    results["propertyMap"] = _build_property_map(arguments, property_columns)

    with open(path, "w") as file:
        json.dump(results, file, indent=2)

    create_custom_intro(config, total_sampled_num)
