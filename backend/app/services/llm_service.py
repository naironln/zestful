"""
Unified LLM service with Claude primary → OpenAI fallback.

Model selection per task:
  - Image analysis (vision): Claude Sonnet 4.6 → GPT-4o-mini
  - Text tasks (mapping):    Claude Haiku 4.5  → GPT-4o-mini
"""

import base64
import json
import logging
import re
from dataclasses import dataclass

import anthropic
import openai

from app.config import settings

logger = logging.getLogger(__name__)

# ── Clients (lazy singletons) ──────────────────────────────────────

_anthropic_client: anthropic.AsyncAnthropic | None = None
_openai_client: openai.AsyncOpenAI | None = None


def get_anthropic_client() -> anthropic.AsyncAnthropic | None:
    global _anthropic_client
    if not settings.anthropic_api_key:
        return None
    if _anthropic_client is None:
        _anthropic_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _anthropic_client


def get_openai_client() -> openai.AsyncOpenAI | None:
    global _openai_client
    if not settings.openai_api_key:
        return None
    if _openai_client is None:
        _openai_client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai_client


# ── Helpers ─────────────────────────────────────────────────────────

def _extract_json(text: str) -> str:
    """Extract JSON object from text that may contain markdown fences."""
    match = re.search(r"\{.*\}", text, re.DOTALL)
    return match.group() if match else text


# ── Vision call (image → JSON) ─────────────────────────────────────

async def _claude_vision(
    b64_image: str, media_type: str, system: str, prompt: str, model: str
) -> str:
    client = get_anthropic_client()
    if not client:
        raise RuntimeError("Anthropic client not configured")

    message = await client.messages.create(
        model=model,
        max_tokens=1024,
        system=system,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": b64_image,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    )
    return message.content[0].text.strip()


async def _openai_vision(
    b64_image: str, media_type: str, system: str, prompt: str, model: str
) -> str:
    client = get_openai_client()
    if not client:
        raise RuntimeError("OpenAI client not configured")

    response = await client.chat.completions.create(
        model=model,
        max_tokens=1024,
        messages=[
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{b64_image}",
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            },
        ],
    )
    return response.choices[0].message.content.strip()


async def vision_call(
    image_bytes: bytes,
    media_type: str,
    system: str,
    prompt: str,
) -> dict:
    """Call a vision model (Claude Sonnet → GPT-4o-mini fallback) and return parsed JSON."""
    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    # Try Claude Sonnet first
    try:
        raw = await _claude_vision(b64, media_type, system, prompt, "claude-sonnet-4-6")
        return json.loads(_extract_json(raw))
    except Exception as exc:
        logger.warning("Claude vision failed: %s — trying OpenAI fallback", exc)

    # Fallback to GPT-4o-mini
    try:
        raw = await _openai_vision(b64, media_type, system, prompt, "gpt-4o-mini")
        return json.loads(_extract_json(raw))
    except Exception as exc:
        logger.error("OpenAI vision fallback also failed: %s", exc)
        raise


# ── Text call (text → JSON) ────────────────────────────────────────

async def _claude_text(system: str, prompt: str, model: str, max_tokens: int = 128) -> str:
    client = get_anthropic_client()
    if not client:
        raise RuntimeError("Anthropic client not configured")

    message = await client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text.strip()


async def _openai_text(system: str, prompt: str, model: str, max_tokens: int = 128) -> str:
    client = get_openai_client()
    if not client:
        raise RuntimeError("OpenAI client not configured")

    response = await client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content.strip()


async def text_call(system: str, prompt: str, max_tokens: int = 128) -> dict:
    """Call a text model (Claude Haiku → GPT-4o-mini fallback) and return parsed JSON."""
    # Try Claude Haiku first
    try:
        raw = await _claude_text(system, prompt, "claude-haiku-4-5-20251001", max_tokens)
        return json.loads(_extract_json(raw))
    except Exception as exc:
        logger.warning("Claude text failed: %s — trying OpenAI fallback", exc)

    # Fallback to GPT-4o-mini
    try:
        raw = await _openai_text(system, prompt, "gpt-4o-mini", max_tokens)
        return json.loads(_extract_json(raw))
    except Exception as exc:
        logger.error("OpenAI text fallback also failed: %s", exc)
        raise
