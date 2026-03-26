import uuid
import os
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from PIL import Image, ExifTags
from fastapi import UploadFile

from app.config import settings
import json

from app.db.queries.meal_queries import (
    create_meal_entry, get_meals_by_range, get_meal_with_details,
    apply_meal_correction, save_portion_estimates, get_meal_full_detail,
    get_meal_full_detail_nutritionist, delete_meal,
)
from app.db.queries.taco_queries import get_meal_nutrition
from app.services.claude_service import analyze_meal_image, correct_meal_analysis, estimate_portions
from app.services.nutrition_mapping_service import map_ingredient_to_food
from app.models.meal import MealEntryOut, MealDetail, IngredientWithPortion


SUPPORTED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}

BRASILIA = ZoneInfo("America/Sao_Paulo")


def _calendar_date_brasilia(dt: datetime) -> str:
    """Data civil (YYYY-MM-DD) em Brasília para o nó Day — alinha listagens ao fuso do app."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(BRASILIA).date().isoformat()


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
                return datetime.strptime(value, "%Y:%m:%d %H:%M:%S").replace(tzinfo=BRASILIA)
    except Exception:
        pass
    return None


def _resolved_media_file(relative_path: str) -> Path | None:
    """Resolve a stored image path under media_dir; reject path traversal."""
    if not relative_path or ".." in relative_path.replace("\\", "/"):
        return None
    base = Path(settings.media_dir).resolve()
    full = (base / relative_path).resolve()
    try:
        full.relative_to(base)
    except ValueError:
        return None
    return full


def _remove_meal_image_file(relative_path: str | None) -> None:
    if not relative_path:
        return
    path = _resolved_media_file(relative_path)
    if path and path.is_file():
        path.unlink()


async def delete_meal_for_user(session, user_id: str, meal_id: str) -> bool:
    deleted, image_path = await delete_meal(session, meal_id, user_id)
    if deleted:
        _remove_meal_image_file(image_path)
    return deleted


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
        eaten_at = dt if dt.tzinfo is not None else dt.replace(tzinfo=BRASILIA)
    else:
        eaten_at = _extract_exif_datetime(image_bytes) or datetime.now(BRASILIA)

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
            "date": _calendar_date_brasilia(eaten_at),
            "image_path": image_path,
            "raw_llm_response": analysis.model_dump_json(),
            "notes": notes or "",
            "confidence": analysis.confidence,
            "ingredients": analysis.ingredients,
        },
    )
    meal["ingredients"] = analysis.ingredients
    meal["dish_name"] = analysis.dish_name

    # Map ingredients to TACO foods (best-effort, non-blocking)
    for ing_name in analysis.ingredients:
        try:
            await map_ingredient_to_food(session, ing_name, analysis.cuisine_origin)
        except Exception:
            pass

    return _meal_record_to_out(meal)


async def list_meals(session, user_id: str, start: str, end: str, meal_type: str | None) -> list[MealEntryOut]:
    meals = await get_meals_by_range(session, user_id, start, end, meal_type)
    return [_meal_record_to_out(m) for m in meals]


async def get_meal(session, user_id: str, meal_id: str) -> MealEntryOut | None:
    meal = await get_meal_with_details(session, meal_id, user_id)
    return _meal_record_to_out(meal) if meal else None


def _meal_record_to_detail(meal: dict, nutrients: list | None = None, base_url: str = "") -> MealDetail:
    """Convert a Neo4j meal record (with ingredients_detail) to MealDetail."""
    eaten_at = meal["eaten_at"]
    logged_at = meal["logged_at"]
    if hasattr(eaten_at, "to_native"):
        eaten_at = eaten_at.to_native()
    if hasattr(logged_at, "to_native"):
        logged_at = logged_at.to_native()

    image_path = meal.get("image_path")
    image_url = f"{base_url}/media/{image_path}" if image_path else None

    plate_composition = None
    raw_comp = meal.get("plate_composition")
    if raw_comp:
        try:
            plate_composition = json.loads(raw_comp) if isinstance(raw_comp, str) else raw_comp
        except Exception:
            plate_composition = None

    ingredients_detail = meal.get("ingredients_detail", [])
    ingredients = [
        IngredientWithPortion(name=i["name"], grams=i.get("grams"))
        for i in ingredients_detail
        if i.get("name")
    ]

    return MealDetail(
        id=meal["id"],
        meal_type=meal["meal_type"],
        dish_name=meal.get("dish_name", ""),
        ingredients=ingredients,
        eaten_at=eaten_at,
        logged_at=logged_at,
        image_url=image_url,
        notes=meal.get("notes"),
        confidence=meal.get("confidence"),
        plate_composition=plate_composition,
        nutrients=nutrients,
    )


async def analyze_meal_nutrition(session, user_id: str, meal_id: str) -> MealDetail | None:
    """Estimate portions from photo, save them, compute nutrients, return full detail."""
    meal = await get_meal_with_details(session, meal_id, user_id)
    if not meal:
        return None

    ingredients = meal.get("ingredients", [])
    image_path = meal.get("image_path")
    if not image_path or not ingredients:
        return None

    full_path = Path(settings.media_dir) / image_path
    if not full_path.exists():
        return None
    image_bytes = full_path.read_bytes()

    suffix = full_path.suffix.lower()
    media_type_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
    media_type = media_type_map.get(suffix, "image/jpeg")

    estimation = await estimate_portions(image_bytes, media_type, ingredients)
    portions = estimation.get("portions", [])
    plate_composition = estimation.get("plate_composition", [])

    await save_portion_estimates(session, meal_id, user_id, portions, plate_composition)

    return await get_meal_detail_full(session, user_id, meal_id)


async def get_meal_detail_full(session, user_id: str, meal_id: str) -> MealDetail | None:
    """Get complete meal detail with portions, plate composition, and computed nutrients."""
    meal = await get_meal_full_detail(session, meal_id, user_id)
    if not meal:
        return None

    nutrition_data = await get_meal_nutrition(session, meal_id, user_id)

    nutrients = None
    if nutrition_data and nutrition_data.get("ingredients"):
        totals: dict[str, dict] = {}
        for ing in nutrition_data["ingredients"]:
            for n in (ing.get("nutrients") or []):
                key = n["key"]
                if key in totals:
                    totals[key]["per_100g"] += n["per_100g"]
                else:
                    totals[key] = {
                        "key": key,
                        "name": n["name"],
                        "unit": n["unit"],
                        "per_100g": n["per_100g"],
                    }
        if totals:
            nutrients = list(totals.values())

    return _meal_record_to_detail(meal, nutrients)


async def get_meal_detail_full_for_nutritionist(
    session, nutritionist_id: str, patient_id: str, meal_id: str
) -> MealDetail | None:
    """Full meal detail for a nutritionist who supervises the patient."""
    meal = await get_meal_full_detail_nutritionist(session, nutritionist_id, patient_id, meal_id)
    if not meal:
        return None

    # Reuse patient-id ownership for nutrition query (ownership already validated above)
    nutrition_data = await get_meal_nutrition(session, meal_id, patient_id)

    nutrients = None
    if nutrition_data and nutrition_data.get("ingredients"):
        totals: dict[str, dict] = {}
        for ing in nutrition_data["ingredients"]:
            for n in (ing.get("nutrients") or []):
                key = n["key"]
                if key in totals:
                    totals[key]["per_100g"] += n["per_100g"]
                else:
                    totals[key] = {
                        "key": key,
                        "name": n["name"],
                        "unit": n["unit"],
                        "per_100g": n["per_100g"],
                    }
        if totals:
            nutrients = list(totals.values())

    return _meal_record_to_detail(meal, nutrients)


async def correct_meal(
    session, user_id: str, meal_id: str, correction: str
) -> MealEntryOut | None:
    # Fetch current meal to get existing dish_name, ingredients, and cuisine_origin
    current = await get_meal_with_details(session, meal_id, user_id)
    if not current:
        return None

    raw = current.get("raw_llm_response") or "{}"
    try:
        llm_data = json.loads(raw)
    except Exception:
        llm_data = {}
    cuisine_origin = llm_data.get("cuisine_origin", "brasileira")

    updated = await correct_meal_analysis(
        dish_name=current.get("dish_name", ""),
        ingredients=current.get("ingredients", []),
        correction=correction,
        cuisine_origin=cuisine_origin,
    )

    dish_name = updated.get("dish_name", current.get("dish_name", ""))
    ingredients = updated.get("ingredients", current.get("ingredients", []))

    meal = await apply_meal_correction(session, meal_id, user_id, dish_name, ingredients)
    if not meal:
        return None

    # Map any new ingredients to TACO (best-effort)
    original_set = {i.lower() for i in current.get("ingredients", [])}
    for ing_name in ingredients:
        if ing_name.lower() not in original_set:
            try:
                await map_ingredient_to_food(session, ing_name, cuisine_origin)
            except Exception:
                pass

    return _meal_record_to_out(meal)
