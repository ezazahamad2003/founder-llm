"""
LLM provider integrations using OpenAI API with streaming support
and connectivity diagnostics for GPT-5
"""
import json
from typing import AsyncGenerator, List, Dict, Optional

from openai import AsyncOpenAI
from openai import OpenAI
import httpx
import time
import logging

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
    
    async def _stream_with_model(model_id: str):
        """Attempt streaming with a specific model. Yields chunks on success; yields nothing if creation failed."""
        nonlocal client
        try:
            if str(model_id).startswith("gpt-5"):
                # Use Responses API for GPT-5
                def to_responses_input(msgs: List[Dict[str, str]]):
                    formatted = []
                    for m in msgs:
                        role = m.get("role", "user")
                        text = m.get("content", "")
                        formatted.append({
                            "role": role,
                            "content": [{"type": "input_text", "text": text}],
                        })
                    return formatted

                # Try streaming first
                try:
                    stream = await client.responses.stream(
                        model=model_id,
                        input=to_responses_input(messages),
                        temperature=temperature,
                        max_output_tokens=max_tokens,
                    )
                    async for event in stream:
                        etype = getattr(event, "type", None)
                        if etype == "response.output_text.delta":
                            delta_text = getattr(event, "delta", "") or ""
                            if delta_text:
                                yield json.dumps({"content": delta_text})
                    # Ensure end signal
                    yield "[DONE]"
                    return
                except Exception:
                    # Fallback to non-stream create and yield once
                    try:
                        resp = await client.responses.create(
                            model=model_id,
                            input=to_responses_input(messages),
                            temperature=temperature,
                            max_output_tokens=max_tokens,
                        )
                        text = None
                        try:
                            text = resp.output_text if hasattr(resp, "output_text") else None
                        except Exception:
                            text = None
                        if not text:
                            try:
                                first = resp.output[0]
                                text = getattr(first, "content", [{}])[0].get("text", {}).get("value")
                            except Exception:
                                text = None
                        if text:
                            yield json.dumps({"content": text})
                            yield "[DONE]"
                            return
                        return
                    except Exception:
                        # If non-stream also fails, just return
                        return
            else:
                # Chat Completions for non-GPT-5
                response = await client.chat.completions.create(
                    model=model_id,
                    messages=messages,
                    stream=True,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                async for chunk in response:
                    if chunk.choices and len(chunk.choices) > 0:
                        delta = chunk.choices[0].delta
                        content = getattr(delta, 'content', None) or ""
                        if content:
                            yield json.dumps({'content': content})
                yield "[DONE]"
                return
        except Exception:
            return

    # Try requested model, then graceful fallbacks
    primary_model = model or settings.model_id
    fallbacks = [m for m in [primary_model, 'gpt-4o', 'gpt-4o-mini']]

    tried_any = False
    for m in fallbacks:
        tried_any = True
        success = False
        async for out in _stream_with_model(m):
            # If we got outputs, pass them through and mark success
            success = True
            yield out
        if success:
            return

    if not tried_any or True:
        # If all attempts failed, send a useful error message
        fallback_list = ', '.join(fallbacks)
        yield json.dumps({'error': f"All model attempts failed. Tried: {fallback_list}. Check API key permissions and model availability."})


def test_gpt5_connection() -> bool:
    """
    Try a simple GPT-5 completion using the Responses API. Returns True if available.
    Behavior:
      - If 400/404/model_not_found: log and suggest using gpt-4o; return False
      - On network/timeout: retry twice with exponential backoff
    """
    settings = get_settings()
    logger = logging.getLogger(__name__)

    client = OpenAI(api_key=settings.openai_api_key)

    # Always test GPT-5 explicitly as primary
    target_model = 'gpt-5'

    # GPT-5 uses the Responses API, not Chat Completions
    test_input = [
        {
            "role": "user",
            "content": [{"type": "input_text", "text": "Reply with the word: READY"}],
        }
    ]

    attempts = 0
    delay = 0.5
    while attempts < 3:
        try:
            attempts += 1
            logger.info(f"🔎 Testing GPT-5 connectivity (attempt {attempts})")
            resp = client.responses.create(
                model=target_model,
                input=test_input,
                max_output_tokens=16,
            )
            # Extract response text
            text = ""
            try:
                text = resp.output_text if hasattr(resp, "output_text") else ""
                if not text and hasattr(resp, "output"):
                    first = resp.output[0]
                    text = getattr(first, "content", [{}])[0].get("text", {}).get("value", "")
            except Exception:
                text = ""
            
            logger.info(f"✅ GPT-5 test succeeded. Sample: '{text}'")
            return True
        except Exception as e:
            # Extract status and error type when available
            status_code = getattr(e, 'status_code', None)
            error_type = getattr(getattr(e, 'error', None), 'type', None) or getattr(e, 'type', None)
            message = str(e)

            logger.error(f"❌ GPT-5 test failed: status={status_code}, type={error_type}, message={message}")

            # Model not available/access denied cases
            if (status_code in (400, 404)) or (error_type in ("model_not_found", "invalid_request_error")):
                logger.warning("⚠️ GPT-5 access not granted for current API key/org. Falling back to gpt-4o.")
                return False

            # Transient network/timeout via httpx
            if isinstance(e, (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.ConnectError)) or (
                status_code in (408, 429, 500, 502, 503, 504)
            ):
                if attempts < 3:
                    logger.warning(f"↻ Transient error. Retrying in {delay:.1f}s...")
                    time.sleep(delay)
                    delay *= 2
                    continue
                else:
                    logger.error("❌ Exhausted retries for GPT-5 test.")
                    return False

            # All other errors are treated as non-retriable
            return False
