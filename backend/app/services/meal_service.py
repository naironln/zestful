import uuid
import os
import io
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from PIL import Image, ExifTags
from pillow_heif import register_heif_opener

register_heif_opener()
from fastapi import UploadFile

from app.config import settings
import json

from app.db.queries.meal_queries import (
    create_meal_entry, get_meals_by_range, get_meal_with_details,
    apply_meal_correction, save_portion_estimates, get_meal_full_detail,
    get_meal_full_detail_nutritionist, delete_meal,
)
import logging

from app.db.queries.taco_queries import get_meal_nutrition
from app.services.claude_service import (
    analyze_meal_image, correct_meal_analysis, estimate_portions,
    extract_image_detail, reconcile_nutrition,
)
from app.services.nutrition_mapping_service import map_ingredient_to_food
from app.services.nutrition_source_service import build_nutrition_trace
from app.models.meal import MealEntryOut, MealDetail, MealNutritionFlags, IngredientWithPortion
from app.models.nutrition import NutritionCalculationTrace, NutrientAdjustment

logger = logging.getLogger(__name__)


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


def _build_nutrition_flags(meal: dict) -> MealNutritionFlags | None:
    if meal.get("has_vegetables") is None and meal.get("meal_source") is None:
        return None
    return MealNutritionFlags(
        has_vegetables=bool(meal.get("has_vegetables", False)),
        is_fruit=bool(meal.get("is_fruit", False)),
        is_dessert=bool(meal.get("is_dessert", False)),
        is_ultra_processed=bool(meal.get("is_ultra_processed", False)),
        has_protein=bool(meal.get("has_protein", False)),
        meal_source=meal.get("meal_source"),
    )


def _meal_record_to_out(meal: dict, base_url: str = "") -> MealEntryOut:
    eaten_at = meal["eaten_at"]
    logged_at = meal["logged_at"]

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
        nutrition_flags=_build_nutrition_flags(meal),
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

    # Convert HEIC/HEIF to JPEG (Claude API doesn't support HEIC)
    if media_type in ("image/heic", "image/heif"):
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=85)
        image_bytes = output.getvalue()
        media_type = "image/jpeg"

    # Determine when the meal was eaten
    if eaten_at_override:
        dt = datetime.fromisoformat(eaten_at_override)
        eaten_at = dt if dt.tzinfo is not None else dt.replace(tzinfo=BRASILIA)
    else:
        eaten_at = _extract_exif_datetime(image_bytes) or datetime.now(BRASILIA)

    # Analyze with Claude
    analysis = await analyze_meal_image(image_bytes, media_type, notes=notes)

    meal_id = str(uuid.uuid4())

    # Save image (always .jpg when converted from HEIC)
    if media_type == "image/jpeg" and (file.filename or "").lower().endswith((".heic", ".heif")):
        suffix = ".jpg"
    else:
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
            "has_vegetables": analysis.has_vegetables,
            "is_fruit": analysis.is_fruit,
            "is_dessert": analysis.is_dessert,
            "is_ultra_processed": analysis.is_ultra_processed,
            "has_protein": analysis.has_protein,
            "meal_source": analysis.meal_source,
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


async def list_meals(
    session,
    user_id: str,
    start: str,
    end: str,
    meal_type: str | None,
    nutrition_flags: dict[str, bool | str] | None = None,
) -> list[MealEntryOut]:
    meals = await get_meals_by_range(session, user_id, start, end, meal_type, nutrition_flags)
    return [_meal_record_to_out(m) for m in meals]


async def get_meal(session, user_id: str, meal_id: str) -> MealEntryOut | None:
    meal = await get_meal_with_details(session, meal_id, user_id)
    return _meal_record_to_out(meal) if meal else None


def _meal_record_to_detail(
    meal: dict,
    nutrients: list | None = None,
    base_url: str = "",
    nutrition_trace: NutritionCalculationTrace | None = None,
) -> MealDetail:
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

    # Parse stored trace if not provided directly
    if nutrition_trace is None:
        raw_trace = meal.get("nutrition_trace")
        if raw_trace:
            try:
                trace_data = json.loads(raw_trace) if isinstance(raw_trace, str) else raw_trace
                nutrition_trace = NutritionCalculationTrace(**trace_data)
            except Exception:
                nutrition_trace = None

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
        nutrition_flags=_build_nutrition_flags(meal),
        nutrition_trace=nutrition_trace,
    )


async def analyze_meal_nutrition(session, user_id: str, meal_id: str) -> MealDetail | None:
    """4-phase nutrition analysis pipeline with full calculation traceability.

    Phase 1: Extract detailed image description (labels, brands, portion cues)
    Phase 2: Estimate portions (grams) using image + context from Phase 1
    Phase 3: Build nutrition trace with hierarchical source selection per ingredient
    Phase 4: Reconcile computed values against image evidence
    """
    meal = await get_meal_with_details(session, meal_id, user_id)
    if not meal:
        return None

    notes = meal.get("notes") or None
    ingredients = meal.get("ingredients", [])
    image_path = meal.get("image_path")
    if not image_path:
        return None

    full_path = Path(settings.media_dir) / image_path
    if not full_path.exists():
        return None
    image_bytes = full_path.read_bytes()

    suffix = full_path.suffix.lower()
    media_type_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
    media_type = media_type_map.get(suffix, "image/jpeg")

    # If ingredients are missing (e.g. initial analysis failed), re-run vision analysis
    if not ingredients:
        reanalysis = await analyze_meal_image(image_bytes, media_type)
        ingredients = reanalysis.ingredients
        if ingredients:
            await apply_meal_correction(
                session, meal_id, user_id,
                reanalysis.dish_name or meal.get("dish_name", ""),
                ingredients,
                {},
            )

    if not ingredients:
        return None

    # ── Phase 1: Detailed image description ───────────────────────
    image_detail = await extract_image_detail(image_bytes, media_type, ingredients, notes=notes)

    # ── Phase 2: Portion estimation (enhanced with image context) ─
    estimation = await estimate_portions(image_bytes, media_type, ingredients, image_detail, notes=notes)
    portions = estimation.get("portions", [])
    plate_composition = estimation.get("plate_composition", [])

    # Save portions first so TACO queries can use grams
    await save_portion_estimates(session, meal_id, user_id, portions, plate_composition)

    # ── Phase 3: Source selection & trace building ─────────────────
    nutrition_data = await get_meal_nutrition(session, meal_id, user_id)

    ingredients_with_grams = [
        {"name": p["ingredient"], "grams": p.get("grams")}
        for p in portions
    ]

    trace = await build_nutrition_trace(
        session, ingredients_with_grams, nutrition_data, image_detail
    )

    # Identify ingredients whose source is NOT TACO (to avoid double-counting)
    non_taco_ingredients = {
        t.ingredient.lower()
        for t in trace.ingredient_traces
        if t.source in ("label", "web_search", "llm_estimate")
    }

    # Compute nutrient totals from TACO, skipping ingredients sourced elsewhere
    nutrients = None
    totals: dict[str, dict] = {}
    if nutrition_data and nutrition_data.get("ingredients"):
        for ing in nutrition_data["ingredients"]:
            ing_name = (ing.get("ingredient") or "").lower()
            if ing_name in non_taco_ingredients:
                continue
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

    # Add nutrients from non-TACO sources (label, web_search, llm_estimate)
    for ing_trace in trace.ingredient_traces:
        if ing_trace.source in ("label", "web_search", "llm_estimate") and ing_trace.nutrients_from_source:
            grams = ing_trace.estimated_grams or 100
            for nv in ing_trace.nutrients_from_source:
                scaled = nv.per_100g * grams / 100.0
                if nv.key in totals:
                    totals[nv.key]["per_100g"] += scaled
                else:
                    totals[nv.key] = {
                        "key": nv.key,
                        "name": nv.name,
                        "unit": nv.unit,
                        "per_100g": scaled,
                    }

    if totals:
        nutrients = list(totals.values())

    # ── Phase 4: Reconciliation ───────────────────────────────────
    macro_totals = {
        k: round(v["per_100g"], 1)
        for k, v in totals.items()
        if k in ("energy_kcal", "protein_g", "carbohydrate_g", "lipid_g", "fiber_g")
    }

    ingredient_calcs = [
        {
            "ingredient": t.ingredient,
            "grams": t.estimated_grams,
            "source": t.source,
            "taco_food": t.taco_food_name,
            "nutrients_per_100g": {nv.key: nv.per_100g for nv in t.nutrients_from_source[:5]},
            "calculated_total": {
                nv.key: round(nv.per_100g * (t.estimated_grams or 100) / 100, 1)
                for nv in t.nutrients_from_source[:5]
            },
        }
        for t in trace.ingredient_traces
    ]

    reconciliation = await reconcile_nutrition(
        detailed_description=image_detail.detailed_description,
        visible_nutrition_info=image_detail.visible_nutrition_info,
        product_identifiers=image_detail.product_identifiers,
        ingredient_calculations=ingredient_calcs,
        macro_totals=macro_totals,
    )

    # Apply reconciliation adjustments to totals
    for adj in reconciliation.get("adjustments", []):
        field = adj.get("field", "")
        try:
            adjusted = float(adj.get("adjusted_value", 0))
            original = float(adj.get("original_value", 0))
        except (TypeError, ValueError):
            logger.warning("Skipping malformed reconciliation adjustment: %s", adj)
            continue
        if not field:
            continue
        if field in totals:
            totals[field]["per_100g"] += (adjusted - original)
        ing_name = adj.get("ingredient", "").lower()
        for t in trace.ingredient_traces:
            if t.ingredient.lower() == ing_name:
                t.adjustments.append(NutrientAdjustment(
                    field=field,
                    original_value=original,
                    adjusted_value=adjusted,
                    reason=str(adj.get("reason", "")),
                    source=str(adj.get("source", "reconciliation")),
                ))
                break

    trace.reconciliation_notes = reconciliation.get("validation_notes", [])
    try:
        rec_confidence = float(reconciliation.get("overall_confidence", 0))
        trace.overall_confidence = round(
            (trace.overall_confidence + rec_confidence) / 2, 2
        )
    except (TypeError, ValueError):
        pass

    if totals:
        nutrients = list(totals.values())

    # ── Persist trace ─────────────────────────────────────────────
    trace_json = trace.model_dump_json()
    detail_desc = image_detail.detailed_description if image_detail else None

    await save_portion_estimates(
        session, meal_id, user_id, portions, plate_composition,
        nutrition_trace=trace_json,
        image_detail_description=detail_desc,
    )

    return await get_meal_detail_full(session, user_id, meal_id)


def _aggregate_nutrients_with_trace(
    nutrition_data: dict | None, stored_trace: NutritionCalculationTrace | None
) -> list[dict] | None:
    """Aggregate TACO nutrients and merge non-TACO sources from stored trace."""
    totals: dict[str, dict] = {}

    non_taco_ingredients: set[str] = set()
    if stored_trace:
        non_taco_ingredients = {
            t.ingredient.lower()
            for t in stored_trace.ingredient_traces
            if t.source in ("label", "web_search", "llm_estimate")
        }

    if nutrition_data and nutrition_data.get("ingredients"):
        for ing in nutrition_data["ingredients"]:
            ing_name = (ing.get("ingredient") or "").lower()
            if ing_name in non_taco_ingredients:
                continue
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

    if stored_trace:
        for ing_trace in stored_trace.ingredient_traces:
            if ing_trace.source in ("label", "web_search", "llm_estimate") and ing_trace.nutrients_from_source:
                grams = ing_trace.estimated_grams or 100
                for nv in ing_trace.nutrients_from_source:
                    scaled = nv.per_100g * grams / 100.0
                    if nv.key in totals:
                        totals[nv.key]["per_100g"] += scaled
                    else:
                        totals[nv.key] = {
                            "key": nv.key,
                            "name": nv.name,
                            "unit": nv.unit,
                            "per_100g": scaled,
                        }

        for adj in (a for t in stored_trace.ingredient_traces for a in t.adjustments):
            field = adj.field
            if field in totals:
                totals[field]["per_100g"] += (adj.adjusted_value - adj.original_value)

    return list(totals.values()) if totals else None


async def get_meal_detail_full(session, user_id: str, meal_id: str) -> MealDetail | None:
    """Get complete meal detail with portions, plate composition, computed nutrients, and trace."""
    meal = await get_meal_full_detail(session, meal_id, user_id)
    if not meal:
        return None

    # Parse stored trace
    stored_trace = None
    raw_trace = meal.get("nutrition_trace")
    if raw_trace:
        try:
            trace_data = json.loads(raw_trace) if isinstance(raw_trace, str) else raw_trace
            stored_trace = NutritionCalculationTrace(**trace_data)
        except Exception:
            pass

    nutrition_data = await get_meal_nutrition(session, meal_id, user_id)
    nutrients = _aggregate_nutrients_with_trace(nutrition_data, stored_trace)

    return _meal_record_to_detail(meal, nutrients, nutrition_trace=stored_trace)


async def get_meal_detail_full_for_nutritionist(
    session, nutritionist_id: str, patient_id: str, meal_id: str
) -> MealDetail | None:
    """Full meal detail for a nutritionist who supervises the patient."""
    meal = await get_meal_full_detail_nutritionist(session, nutritionist_id, patient_id, meal_id)
    if not meal:
        return None

    stored_trace = None
    raw_trace = meal.get("nutrition_trace")
    if raw_trace:
        try:
            trace_data = json.loads(raw_trace) if isinstance(raw_trace, str) else raw_trace
            stored_trace = NutritionCalculationTrace(**trace_data)
        except Exception:
            pass

    nutrition_data = await get_meal_nutrition(session, meal_id, patient_id)
    nutrients = _aggregate_nutrients_with_trace(nutrition_data, stored_trace)

    return _meal_record_to_detail(meal, nutrients, nutrition_trace=stored_trace)


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

    nutrition_flags = {
        k: updated.get(k)
        for k in ("has_vegetables", "is_fruit", "is_dessert", "is_ultra_processed", "has_protein", "meal_source")
        if updated.get(k) is not None
    }

    meal = await apply_meal_correction(session, meal_id, user_id, dish_name, ingredients, nutrition_flags)
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
