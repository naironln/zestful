import uuid
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

from PIL import Image, ExifTags
from fastapi import UploadFile

from app.config import settings
from app.db.queries.meal_queries import create_meal_entry, get_meals_by_range, get_meal_with_details
from app.services.claude_service import analyze_meal_image
from app.models.meal import MealEntryOut


SUPPORTED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}

BRASILIA_TZ = timezone(timedelta(hours=-3))


def _extract_exif_datetime(image_bytes: bytes) -> datetime | None:
    try:
        import io
        img = Image.open(io.BytesIO(image_bytes))
        exif_data = img._getexif()
        if not exif_data:
            return None
        for tag_id, value in exif_data.items():
            tag = ExifTags.TAGS.get(tag_id, "")
            if tag == "DateTimeOriginal":
                return datetime.strptime(value, "%Y:%m:%d %H:%M:%S").replace(tzinfo=BRASILIA_TZ)
    except Exception:
        pass
    return None


def _save_image(image_bytes: bytes, user_id: str, meal_id: str, suffix: str) -> str:
    user_dir = Path(settings.media_dir) / "meals" / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{meal_id}{suffix}"
    filepath = user_dir / filename
    filepath.write_bytes(image_bytes)
    return f"meals/{user_id}/{filename}"


def _meal_record_to_out(meal: dict, base_url: str = "") -> MealEntryOut:
    eaten_at = meal["eaten_at"]
    logged_at = meal["logged_at"]

    # neo4j DateTime objects have .to_native() method
    if hasattr(eaten_at, "to_native"):
        eaten_at = eaten_at.to_native()
    if hasattr(logged_at, "to_native"):
        logged_at = logged_at.to_native()

    image_path = meal.get("image_path")
    image_url = f"{base_url}/media/{image_path}" if image_path else None

    return MealEntryOut(
        id=meal["id"],
        meal_type=meal["meal_type"],
        dish_name=meal.get("dish_name", ""),
        ingredients=meal.get("ingredients", []),
        eaten_at=eaten_at,
        logged_at=logged_at,
        image_url=image_url,
        notes=meal.get("notes"),
        confidence=meal.get("confidence"),
    )


async def upload_meal(
    session,
    user_id: str,
    file: UploadFile,
    notes: str | None,
    eaten_at_override: str | None,
) -> MealEntryOut:
    image_bytes = await file.read()
    media_type = file.content_type or "image/jpeg"

    # Determine when the meal was eaten
    if eaten_at_override:
        dt = datetime.fromisoformat(eaten_at_override)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=BRASILIA_TZ)
        eaten_at = dt
    else:
        eaten_at = _extract_exif_datetime(image_bytes) or datetime.now(BRASILIA_TZ)

    # Analyze with Claude
    analysis = await analyze_meal_image(image_bytes, media_type)

    meal_id = str(uuid.uuid4())

    # Save image
    suffix = os.path.splitext(file.filename or "photo.jpg")[1] or ".jpg"
    image_path = _save_image(image_bytes, user_id, meal_id, suffix)

    # Store in Neo4j
    meal = await create_meal_entry(
        session,
        {
            "id": meal_id,
            "user_id": user_id,
            "meal_type": analysis.meal_type,
            "dish_name": analysis.dish_name,
            "eaten_at": eaten_at.isoformat(),
            "date": eaten_at.astimezone(BRASILIA_TZ).date().isoformat(),
            "image_path": image_path,
            "raw_llm_response": analysis.model_dump_json(),
            "notes": notes or "",
            "confidence": analysis.confidence,
            "ingredients": analysis.ingredients,
        },
    )
    meal["ingredients"] = analysis.ingredients
    meal["dish_name"] = analysis.dish_name
    return _meal_record_to_out(meal)


async def list_meals(session, user_id: str, start: str, end: str, meal_type: str | None) -> list[MealEntryOut]:
    meals = await get_meals_by_range(session, user_id, start, end, meal_type)
    return [_meal_record_to_out(m) for m in meals]


async def get_meal(session, user_id: str, meal_id: str) -> MealEntryOut | None:
    meal = await get_meal_with_details(session, meal_id, user_id)
    return _meal_record_to_out(meal) if meal else None
