import pytest
import httpx
from unittest.mock import patch, MagicMock, PropertyMock
import os
from scatter.pipeline.services import llm

@pytest.fixture(autouse=True)
def cleanup_env():
    """Clean up environment variables after each test."""
    env_vars = [
        "USE_AZURE",  # Added for consistency with embedding tests
        "OPENAI_API_KEY",
        "AZURE_OPENAI_API_KEY",
        "AZURE_OPENAI_ENDPOINT"
    ]
    old_env = {var: os.environ.get(var) for var in env_vars}
    yield
    for var, value in old_env.items():
        if value is None:
            os.environ.pop(var, None)
        else:
            os.environ[var] = value

def create_mock_response(content):
    """Create a mock response object with the correct OpenAI API response structure."""
    return type("MockResponse", (), {
        "choices": [
            type("MockChoice", (), {
                "message": type("MockMessage", (), {"content": content})
            })
        ]
    })()


@patch("openai.OpenAI")
def test_request_to_openai(mock_openai_class):
    # Set up mock client with proper structure
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = create_mock_response("Mocked Response")
    mock_openai_class.return_value = mock_client
    
    # Set required environment variable
    os.environ["OPENAI_API_KEY"] = "dummy_key"

    messages = [{"role": "user", "content": "test"}]
    result = llm.request_to_openai(messages)
    assert result == "Mocked Response"

@patch("scatter.pipeline.services.llm.AzureOpenAI")
def test_request_to_azure_openai(mock_azure_class):
    # Set up mock response exactly as shown in example
    mock_response = type("MockResponse", (), {
        "choices": [
            type("MockChoice", (), {
                "message": type("MockMessage", (), {"content": "Mocked Azure Response"})
            })
        ]
    })()
    
    # Set up mock completions
    mock_completions = MagicMock()
    mock_completions.create.return_value = mock_response
    
    # Set up mock chat
    mock_chat = MagicMock()
    mock_chat.completions = mock_completions
    
    # Set up mock client
    mock_client = MagicMock()
    mock_client.chat = mock_chat
    
    # Return mock client directly without initialization
    mock_azure_class.return_value = mock_client

    # Set required environment variables
    os.environ["AZURE_OPENAI_API_KEY"] = "dummy_key"
    os.environ["AZURE_OPENAI_ENDPOINT"] = "dummy_endpoint"

    messages = [{"role": "user", "content": "test"}]
    result = llm.request_to_azure_openai(messages)
    assert result == "Mocked Azure Response"

@patch("httpx.AsyncClient")
@patch("httpx.Client")
@patch("openai._base_client.AsyncHttpxClientWrapper")
@patch("openai._base_client.SyncHttpxClientWrapper")
@patch("openai.OpenAI")
def test_request_to_openai_error(mock_openai_class, mock_http_wrapper, mock_async_wrapper,
                               mock_http_client, mock_async_client):
    # Set up mock clients
    mock_http_client.return_value = MagicMock()
    mock_async_client.return_value = MagicMock()
    mock_http_wrapper.return_value = MagicMock()
    mock_async_wrapper.return_value = MagicMock()
    
    mock_client = MagicMock()
    mock_completions = MagicMock()
    mock_completions.create.side_effect = Exception("API Error")
    mock_client.chat.completions = mock_completions
    mock_openai_class.return_value = mock_client
    
    # Set required environment variable
    os.environ["OPENAI_API_KEY"] = "dummy_key"
    
    messages = [{"role": "user", "content": "test"}]
    with pytest.raises(Exception):
        llm.request_to_openai(messages)

@patch("httpx.AsyncClient")
@patch("httpx.Client")
@patch("openai._base_client.AsyncHttpxClientWrapper")
@patch("openai._base_client.SyncHttpxClientWrapper")
@patch("openai.AzureOpenAI")
def test_request_to_azure_openai_error(mock_azure_class, mock_http_wrapper, mock_async_wrapper,
                                     mock_http_client, mock_async_client):
    # Set up mock clients
    mock_http_client.return_value = MagicMock()
    mock_async_client.return_value = MagicMock()
    mock_http_wrapper.return_value = MagicMock()
    mock_async_wrapper.return_value = MagicMock()
    
    mock_client = MagicMock()
    mock_completions = MagicMock()
    mock_completions.create.side_effect = Exception("Azure API Error")
    mock_client.chat.completions = mock_completions
    mock_azure_class.return_value = mock_client

    # Set required environment variables
    os.environ["AZURE_OPENAI_API_KEY"] = "dummy_key"
    os.environ["AZURE_OPENAI_ENDPOINT"] = "dummy_endpoint"
    
    messages = [{"role": "user", "content": "test"}]
    with pytest.raises(Exception):
        llm.request_to_azure_openai(messages)

    # Clean up environment variables
    del os.environ["AZURE_OPENAI_API_KEY"]
    del os.environ["AZURE_OPENAI_ENDPOINT"]
