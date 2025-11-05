"""
LLM provider integrations using OpenAI API with streaming support
"""
import json
from typing import AsyncGenerator, List, Dict, Optional

from openai import AsyncOpenAI

from app.utils import get_settings


async def openai_stream(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 4096
) -> AsyncGenerator[str, None]:
    """
    Stream chat completion from OpenAI API
    
    Args:
        messages: List of message dictionaries with 'role' and 'content'
        model: Model ID to use (defaults to settings.model_id)
        temperature: Sampling temperature
        max_tokens: Maximum tokens to generate
    
    Yields:
        SSE-formatted chunks with content
    """
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    if model is None:
        model = settings.model_id
    
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        async for chunk in response:
            if chunk.choices and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta
                content = delta.content or ""
                
                if content:
                    # Return just the JSON, EventSourceResponse will add "data:" prefix
                    yield json.dumps({'content': content})
        
        # Send completion signal
        yield "[DONE]"
    
    except Exception as e:
        error_msg = f"OpenAI API error: {str(e)}"
        yield json.dumps({'error': error_msg})
