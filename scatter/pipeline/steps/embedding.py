import os

import pandas as pd
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, AzureOpenAIEmbeddings
from tqdm import tqdm

load_dotenv("../../.env")

EMBDDING_MODELS = [
    "text-embedding-3-large",
    "text-embedding-3-small",
]


def _validate_model(model):
    if model not in EMBDDING_MODELS:
        raise RuntimeError(
            f"Invalid embedding model: {model}, available models: {EMBDDING_MODELS}"
        )


def embed_by_openai(args, model):
    if os.getenv("USE_AZURE"):
        embeds = AzureOpenAIEmbeddings(
            model=model,
            azure_endpoint=os.getenv("AZURE_EMBEDDING_ENDPOINT"),
            openai_api_key=os.getenv("AZURE_OPENAI_API_KEY")
        ).embed_documents(args)
    else:
        _validate_model(model)
        embeds = OpenAIEmbeddings(
            model=model,
            openai_api_key=os.getenv("OPENAI_API_KEY")
        ).embed_documents(args)
    return embeds


def embedding(config):
    model = config["embedding"]["model"]

    dataset = config["output_dir"]
    path = f"outputs/{dataset}/embeddings.pkl"
    arguments = pd.read_csv(f"outputs/{dataset}/args.csv")
    embeddings = []
    batch_size = 1000
    for i in tqdm(range(0, len(arguments), batch_size)):
        args = arguments["argument"].tolist()[i: i + batch_size]
        embeds = embed_by_openai(args, model)
        embeddings.extend(embeds)
    df = pd.DataFrame(
        [
            {"arg-id": arguments.iloc[i]["arg-id"], "embedding": e}
            for i, e in enumerate(embeddings)
        ]
    )
    df.to_pickle(path)
