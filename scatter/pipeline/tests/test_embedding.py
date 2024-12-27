import pytest
from unittest.mock import patch, MagicMock
import os
from scatter.pipeline.steps.embedding import embed_by_openai

@pytest.fixture(autouse=True)
def cleanup_env():
    """Clean up environment variables after each test."""
    env_vars = [
        "USE_AZURE",
        "OPENAI_API_KEY",
        "AZURE_OPENAI_API_KEY",
        "AZURE_OPENAI_ENDPOINT",  # Added missing AZURE_OPENAI_ENDPOINT
        "AZURE_EMBEDDING_ENDPOINT"
    ]
    old_env = {var: os.environ.get(var) for var in env_vars}
    yield
    for var, value in old_env.items():
        if value is None:
            os.environ.pop(var, None)
        else:
            os.environ[var] = value

@patch("httpx.AsyncClient")
@patch("httpx.Client")
@patch("openai._base_client.AsyncHttpxClientWrapper")
@patch("openai._base_client.SyncHttpxClientWrapper")
@patch("openai.OpenAI")
@patch("openai.AzureOpenAI")
@patch("langchain_openai.OpenAIEmbeddings")
@patch("langchain_openai.AzureOpenAIEmbeddings")
def test_embed_by_openai(mock_azure_embeddings, mock_openai_embeddings, 
                        mock_openai_client, mock_azure_client,
                        mock_http_wrapper, mock_async_wrapper,
                        mock_http_client, mock_async_client):
    # Mock HTTP clients to avoid proxies error
    mock_http_client.return_value = MagicMock()
    mock_async_client.return_value = MagicMock()
    mock_http_wrapper.return_value = MagicMock()
    mock_async_wrapper.return_value = MagicMock()
    
    # Set up mock OpenAI client
    mock_openai_client.return_value = MagicMock()
    mock_openai_client.return_value.embeddings = MagicMock()
    
    # Set up mock Azure client
    mock_azure_client.return_value = MagicMock()
    mock_azure_client.return_value.embeddings = MagicMock()
    
    # Set up embeddings instances
    mock_openai_instance = MagicMock()
    mock_azure_instance = MagicMock()
    mock_openai_embeddings.return_value = mock_openai_instance
    mock_azure_embeddings.return_value = mock_azure_instance
    
    # Set up mock responses
    mock_openai_instance.embed_documents.return_value = ["openai vector"]
    mock_azure_instance.embed_documents.return_value = ["azure vector"]
    
    # Set required environment variables
    os.environ["OPENAI_API_KEY"] = "dummy_key"
    os.environ["AZURE_OPENAI_API_KEY"] = "dummy_key"
    os.environ["AZURE_OPENAI_ENDPOINT"] = "dummy_endpoint"

    # Test OpenAI path (Azure OFF)
    old_env = os.environ.get("USE_AZURE")
    os.environ["USE_AZURE"] = ""
    os.environ["OPENAI_API_KEY"] = "dummy_key"  # Required by OpenAIEmbeddings

    vectors = embed_by_openai(["doc1"], model="text-embedding-3-large")
    assert vectors == ["openai vector"]

    # Test Azure path (Azure ON)
    os.environ["USE_AZURE"] = "1"
    os.environ["AZURE_OPENAI_API_KEY"] = "dummy_key"
    os.environ["AZURE_OPENAI_ENDPOINT"] = "dummy_endpoint"

    vectors = embed_by_openai(["doc1"], model="text-embedding-3-large")
    assert vectors == ["azure vector"]

    # Environment cleanup handled by fixture

@patch("httpx.AsyncClient")
@patch("httpx.Client")
@patch("openai._base_client.AsyncHttpxClientWrapper")
@patch("openai._base_client.SyncHttpxClientWrapper")
@patch("openai.OpenAI")
@patch("langchain_openai.OpenAIEmbeddings")
def test_embed_by_openai_error(mock_openai_embeddings, mock_openai_client,
                              mock_http_wrapper, mock_async_wrapper,
                              mock_http_client, mock_async_client):
    # Set up mock HTTP clients
    mock_http_client.return_value = MagicMock()
    mock_async_client.return_value = MagicMock()
    mock_http_wrapper.return_value = MagicMock()
    mock_async_wrapper.return_value = MagicMock()
    
    # Set up mock OpenAI client
    mock_openai_client.return_value = MagicMock()
    mock_openai_client.return_value.embeddings = MagicMock()
    
    # Set up embeddings mock
    mock_instance = MagicMock()
    mock_openai_embeddings.return_value = mock_instance
    mock_instance.embed_documents.side_effect = Exception("Embedding Error")

    os.environ["OPENAI_API_KEY"] = "dummy_key"
    os.environ["USE_AZURE"] = ""
    
    with pytest.raises(Exception):
        embed_by_openai(["doc1"], model="text-embedding-3-large")

    # Environment cleanup handled by fixture

@patch("httpx.AsyncClient")
@patch("httpx.Client")
@patch("openai._base_client.AsyncHttpxClientWrapper")
@patch("openai._base_client.SyncHttpxClientWrapper")
@patch("openai.AzureOpenAI")
@patch("langchain_openai.AzureOpenAIEmbeddings")
def test_embed_by_azure_openai_error(mock_azure_embeddings, mock_azure_client,
                                   mock_http_wrapper, mock_async_wrapper,
                                   mock_http_client, mock_async_client):
    # Set up mock HTTP clients
    mock_http_client.return_value = MagicMock()
    mock_async_client.return_value = MagicMock()
    mock_http_wrapper.return_value = MagicMock()
    mock_async_wrapper.return_value = MagicMock()
    
    # Set up mock Azure client
    mock_azure_client.return_value = MagicMock()
    mock_azure_client.return_value.embeddings = MagicMock()
    
    # Set up embeddings mock
    mock_instance = MagicMock()
    mock_azure_embeddings.return_value = mock_instance
    mock_instance.embed_documents.side_effect = Exception("Azure Embedding Error")

    os.environ["USE_AZURE"] = "1"
    os.environ["AZURE_OPENAI_API_KEY"] = "dummy_key"
    os.environ["AZURE_OPENAI_ENDPOINT"] = "dummy_endpoint"
    
    with pytest.raises(Exception):
        embed_by_openai(["doc1"], model="text-embedding-3-large")
    
    # Environment cleanup handled by fixture
