import base64
import json
import re

import anthropic

from app.config import settings
from app.models.analysis import LLMAnalysisResult

SYSTEM_PROMPT = "You are a food analysis assistant. Always respond with valid JSON only, no markdown, no explanation."

USER_PROMPT = """Analyze this meal photo and return a JSON object with exactly these fields:
{
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "dish_name": "short descriptive name of the main dish (max 60 chars)",
  "ingredients": ["ingredient1", "ingredient2", ...],
  "confidence": 0.0-1.0
}

Base meal_type on visual cues (breakfast foods, typical serving times, etc.).
List up to 10 ingredients you can identify.
Return ONLY the JSON object."""

_client: anthropic.AsyncAnthropic | None = None


def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


async def analyze_meal_image(image_bytes: bytes, media_type: str = "image/jpeg") -> LLMAnalysisResult:
    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    try:
        client = get_client()
        message = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64,
                            },
                        },
                        {"type": "text", "text": USER_PROMPT},
                    ],
                }
            ],
        )

        raw_text = message.content[0].text.strip()

        # Extract JSON if wrapped in code fences
        json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if json_match:
            raw_text = json_match.group()

        data = json.loads(raw_text)
        return LLMAnalysisResult(**data)

    except Exception:
        return LLMAnalysisResult()
