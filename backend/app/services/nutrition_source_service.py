"""
Hierarchical nutrition source selection per ingredient.

For each ingredient in a meal, determines the best source for nutritional data:
  1. Label: visible nutritional info on packaging (highest priority for packaged products)
  2. Web search: Anthropic web_search for identifiable branded products
  3. TACO: Tabela Brasileira de Composição de Alimentos (primary for natural/prepared foods)
  4. LLM estimate: general knowledge fallback (lowest confidence)
"""

import json
import logging

from neo4j import AsyncSession

from app.models.nutrition import (
    ImageDetailResult,
    IngredientTrace,
    NutrientAdjustment,
    NutrientValue,
    NutritionCalculationTrace,
)
from app.services.llm_service import text_call, web_search_call

logger = logging.getLogger(__name__)


WEB_SEARCH_NUTRITION_SYSTEM = (
    "Você é um nutricionista brasileiro especializado em rótulos e tabelas nutricionais. "
    "Pesquise a informação nutricional OFICIAL do produto solicitado — priorize sites do fabricante, "
    "tabelas nutricionais de rótulos e bases de dados confiáveis (FatSecret, MyFitnessPal, Open Food Facts). "
    "É FUNDAMENTAL encontrar o tamanho real da embalagem/porção e os valores nutricionais por porção. "
    "Responda APENAS com JSON válido, sem markdown, sem explicações."
)

WEB_SEARCH_NUTRITION_PROMPT = """Encontre a informação nutricional completa de: {product_description}

IMPORTANTE: Descubra o tamanho real da embalagem/porção deste produto (em ml ou g).
Para produtos industrializados brasileiros, a informação nutricional no rótulo é sempre por porção.
Primeiro encontre a porção, depois calcule os valores por 100g a partir dela.

Retorne um objeto JSON:
{{
  "product_name": "nome completo do produto com tamanho (ex: YoPro Chocolate 250ml)",
  "source_url": "URL da fonte se disponível",
  "package_size_g": <float — peso/volume da embalagem em gramas (ex: 250 para 250ml/250g), null se desconhecido>,
  "serving_size_g": <float — tamanho da porção do rótulo em gramas, null se desconhecido>,
  "per_serving": {{
    "energy_kcal": <float — valor por porção/embalagem>,
    "protein_g": <float>,
    "carbohydrate_g": <float>,
    "lipid_g": <float>,
    "fiber_g": <float>
  }},
  "per_100g": {{
    "energy_kcal": <float — valor por 100g, calculado a partir de per_serving se necessário>,
    "protein_g": <float>,
    "carbohydrate_g": <float>,
    "lipid_g": <float>,
    "fiber_g": <float>
  }},
  "confidence": <float 0.0-1.0>
}}

Se não encontrar informação confiável:
{{"product_name": null, "source_url": null, "package_size_g": null, "serving_size_g": null, "per_serving": {{}}, "per_100g": {{}}, "confidence": 0.0}}"""


LLM_ESTIMATE_SYSTEM = (
    "Você é um nutricionista brasileiro com amplo conhecimento de composição alimentar. "
    "Quando não há fonte de dados estruturada disponível, estime a composição nutricional "
    "com base em seu conhecimento sobre alimentos similares. "
    "Responda APENAS com JSON válido, sem markdown, sem explicações."
)

LLM_ESTIMATE_PROMPT = """Estime a composição nutricional por 100g de: "{ingredient}"

Contexto do prato: {context}

Retorne um objeto JSON:
{{
  "per_100g": {{
    "energy_kcal": <float>,
    "protein_g": <float>,
    "carbohydrate_g": <float>,
    "lipid_g": <float>,
    "fiber_g": <float>
  }},
  "confidence": <float 0.0-1.0>,
  "reasoning": "explicação breve de como estimou"
}}"""


MACRO_KEYS = ["energy_kcal", "protein_g", "carbohydrate_g", "lipid_g", "fiber_g"]
MACRO_NAMES = {
    "energy_kcal": "Energia",
    "protein_g": "Proteína",
    "carbohydrate_g": "Carboidrato",
    "lipid_g": "Lipídios",
    "fiber_g": "Fibra alimentar",
}
MACRO_UNITS = {
    "energy_kcal": "kcal",
    "protein_g": "g",
    "carbohydrate_g": "g",
    "lipid_g": "g",
    "fiber_g": "g",
}


def _label_nutrients_for_ingredient(
    ingredient: str, visible_info: list[dict]
) -> list[NutrientValue] | None:
    """Check if visible_nutrition_info has data matching this ingredient."""
    if not visible_info:
        return None

    ing_lower = ingredient.lower()
    ing_words = _significant_words(ingredient)

    matched_entries = []
    for entry in visible_info:
        product = entry.get("product", "").lower()
        if ing_lower in product or product in ing_lower:
            matched_entries.append(entry)
            continue
        product_words = _significant_words(product)
        if len(ing_words & product_words) >= 2:
            matched_entries.append(entry)

    if not matched_entries:
        return None

    nutrients = []
    for entry in matched_entries:
        nutrient_name = entry.get("nutrient", "").lower()
        value = entry.get("value")
        if value is None:
            continue

        key = None
        if "proteí" in nutrient_name or "protein" in nutrient_name:
            key = "protein_g"
        elif "carboidrat" in nutrient_name or "carb" in nutrient_name:
            key = "carbohydrate_g"
        elif "gordura" in nutrient_name or "lipí" in nutrient_name or "fat" in nutrient_name:
            key = "lipid_g"
        elif "caloria" in nutrient_name or "kcal" in nutrient_name or "energi" in nutrient_name:
            key = "energy_kcal"
        elif "fibra" in nutrient_name or "fiber" in nutrient_name:
            key = "fiber_g"

        if key:
            nutrients.append(NutrientValue(
                key=key,
                name=MACRO_NAMES.get(key, nutrient_name),
                unit=MACRO_UNITS.get(key, entry.get("unit", "g")),
                per_100g=float(value),
            ))

    return nutrients if nutrients else None


_STOP_WORDS = frozenset({
    "de", "do", "da", "dos", "das", "com", "sem", "e", "ou", "para", "por",
    "em", "no", "na", "nos", "nas", "um", "uma", "o", "a", "os", "as",
    "sabor", "tipo", "zero", "light", "diet",
})


def _stem_pt(word: str) -> str:
    """Minimal Portuguese stemming for matching (gender/plural normalization)."""
    if word.endswith("s") and len(word) > 3:
        word = word[:-1]
    for suffix in ("ica", "ico", "ica", "ada", "ado", "ido", "ida"):
        if word.endswith(suffix) and len(word) > len(suffix) + 2:
            return word[: -len(suffix)]
    return word


def _significant_words(text: str) -> set[str]:
    """Extract significant stemmed words (3+ chars, not stop words) from text."""
    return {
        _stem_pt(w) for w in text.lower().split()
        if len(w) >= 3 and w not in _STOP_WORDS
    }


def _find_product_for_ingredient(
    ingredient: str, product_identifiers: list[dict]
) -> dict | None:
    """Find a product identifier matching this ingredient.

    Uses a multi-level matching strategy:
    1. Substring match (ingredient in product name or vice versa)
    2. Word overlap (2+ significant words in common)
    3. Single-product fallback (1 ingredient + 1 product = auto-match)
    """
    if not product_identifiers:
        return None

    ing_lower = ingredient.lower()
    ing_words = _significant_words(ingredient)

    best_match: dict | None = None
    best_overlap = 0

    for product in product_identifiers:
        name = product.get("name", "").lower()
        ptype = product.get("type", "").lower()
        brand = product.get("brand", "").lower()

        if ing_lower in name or name in ing_lower or ing_lower in ptype:
            return product

        product_words = _significant_words(name) | _significant_words(ptype) | _significant_words(brand)
        overlap = len(ing_words & product_words)
        if overlap >= 2 and overlap > best_overlap:
            best_match = product
            best_overlap = overlap

    if best_match:
        return best_match

    if len(product_identifiers) == 1:
        return product_identifiers[0]

    return None


def _dict_to_nutrient_values(per_100g: dict) -> list[NutrientValue]:
    """Convert a flat {key: value} dict to NutrientValue list."""
    values = []
    for key in MACRO_KEYS:
        val = per_100g.get(key)
        if val is not None and val > 0:
            values.append(NutrientValue(
                key=key,
                name=MACRO_NAMES.get(key, key),
                unit=MACRO_UNITS.get(key, "g"),
                per_100g=float(val),
            ))
    return values


def _taco_nutrients_to_raw_per_100g(taco_nutrients: list[dict]) -> list[NutrientValue]:
    """Extract raw per-100g values from TACO query results, deduplicating by key.

    The TACO query returns both `per_100g` (scaled by grams) and `raw_per_100g`
    (actual TACO value per 100g). For decomposed ingredients (multiple MAPS_TO
    with fractions), multiple entries share the same key and must be summed.
    """
    aggregated: dict[str, dict] = {}
    for n in taco_nutrients:
        key = n.get("key")
        raw = n.get("raw_per_100g")
        if not key or raw is None:
            continue
        if key in aggregated:
            aggregated[key]["per_100g"] += float(raw)
        else:
            aggregated[key] = {
                "key": key,
                "name": n.get("name", key),
                "unit": n.get("unit", "g"),
                "per_100g": float(raw),
            }
    return [NutrientValue(**v) for v in aggregated.values()]


async def _get_ingredient_taco_info(
    session: AsyncSession, ingredient_name: str
) -> dict:
    """Get TACO mapping info for an ingredient (confidence, taco_id, food_name, source type)."""
    name = ingredient_name.lower()
    result = await session.run(
        """
        MATCH (i:Ingredient {name: $name})-[mt:MAPS_TO]->(f:Food)
        RETURN f.taco_id AS taco_id, f.name AS food_name,
               mt.confidence AS confidence, mt.fraction AS fraction
        """,
        name=name,
    )
    records = []
    async for record in result:
        records.append(dict(record))

    if not records:
        return {"mapped": False, "taco_id": None, "food_name": None, "confidence": 0.0, "source": "unmapped", "fractions": []}

    if len(records) == 1 and (records[0].get("fraction") or 1.0) == 1.0:
        r = records[0]
        return {
            "mapped": True,
            "taco_id": r["taco_id"],
            "food_name": r["food_name"],
            "confidence": r.get("confidence") or 0.5,
            "source": "taco",
            "fractions": records,
        }

    return {
        "mapped": True,
        "taco_id": None,
        "food_name": ", ".join(r["food_name"] for r in records if r.get("food_name")),
        "confidence": records[0].get("confidence") or 0.5,
        "source": "taco_decomposition",
        "fractions": records,
    }


async def resolve_ingredient_source(
    session: AsyncSession,
    ingredient_name: str,
    grams: float | None,
    image_detail: ImageDetailResult | None,
    taco_nutrients: list[dict] | None,
) -> IngredientTrace:
    """Determine the best nutritional data source for a single ingredient.

    Priority: label > web_search > taco (high confidence) > taco (low) > llm_estimate
    """
    taco_info = await _get_ingredient_taco_info(session, ingredient_name)

    # Prepare trace with defaults
    trace = IngredientTrace(
        ingredient=ingredient_name,
        estimated_grams=grams,
        source="taco",
        taco_food_name=taco_info.get("food_name"),
        taco_id=taco_info.get("taco_id"),
        taco_confidence=taco_info.get("confidence"),
    )

    # Collect TACO nutrients as raw per-100g values (deduplicated for decompositions)
    if taco_nutrients:
        trace.nutrients_from_source = _taco_nutrients_to_raw_per_100g(taco_nutrients)

    # Check if this is a branded/industrial product
    product = None
    if image_detail and image_detail.product_identifiers:
        product = _find_product_for_ingredient(
            ingredient_name, image_detail.product_identifiers
        )

    # Strategy 1: For non-branded items, check visible label data directly.
    # For branded products, skip — label values are per-serving (not per-100g)
    # and web search will provide accurate per-100g + package size instead.
    # Label data is still used in reconciliation (Phase 4) for validation.
    if not product and image_detail and image_detail.visible_nutrition_info:
        label_nutrients = _label_nutrients_for_ingredient(
            ingredient_name, image_detail.visible_nutrition_info
        )
        if label_nutrients:
            trace.source = "label"
            trace.nutrients_from_source = label_nutrients
            trace.reasoning = "Valores lidos do rótulo visível na embalagem"
            return trace

    # Strategy 2: Web search for identifiable branded/industrial products
    if product:
        try:
            desc = product.get("name", ingredient_name)
            brand = product.get("brand")
            if brand:
                desc = f"{desc} ({brand})"
            prompt = WEB_SEARCH_NUTRITION_PROMPT.format(product_description=desc)
            web_result = await web_search_call(
                WEB_SEARCH_NUTRITION_SYSTEM, prompt, max_tokens=1536
            )
            web_conf = web_result.get("confidence", 0)
            per_100g = web_result.get("per_100g", {})
            if web_conf >= 0.3 and per_100g:
                trace.source = "web_search"
                trace.nutrients_from_source = _dict_to_nutrient_values(per_100g)

                pkg_size = web_result.get("package_size_g")
                srv_size = web_result.get("serving_size_g")
                actual_size = None
                if pkg_size and isinstance(pkg_size, (int, float)) and pkg_size > 0:
                    actual_size = float(pkg_size)
                elif srv_size and isinstance(srv_size, (int, float)) and srv_size > 0:
                    actual_size = float(srv_size)

                if actual_size:
                    trace.estimated_grams = actual_size
                    trace.reasoning = (
                        f"Informação nutricional via busca web para '{desc}' "
                        f"(embalagem: {actual_size:.0f}g)"
                    )
                else:
                    trace.reasoning = f"Informação nutricional obtida via busca web para '{desc}'"
                return trace
        except Exception as exc:
            logger.warning("Web search failed for '%s': %s", ingredient_name, exc)

    # Strategy 3: TACO with sufficient confidence
    if taco_info["mapped"] and (taco_info.get("confidence") or 0) >= 0.3:
        trace.source = "taco" if taco_info["source"] == "taco" else "taco_decomposition"
        trace.reasoning = (
            f"Mapeado para TACO: {taco_info['food_name']} "
            f"(confiança {taco_info['confidence']:.1%})"
        )
        return trace

    # Strategy 4: LLM general knowledge estimate
    try:
        context = ""
        if image_detail and image_detail.detailed_description:
            context = image_detail.detailed_description[:300]
        prompt = LLM_ESTIMATE_PROMPT.format(ingredient=ingredient_name, context=context or "sem contexto adicional")
        estimate = await text_call(LLM_ESTIMATE_SYSTEM, prompt, max_tokens=512)
        per_100g = estimate.get("per_100g", {})
        if per_100g:
            trace.source = "llm_estimate"
            trace.nutrients_from_source = _dict_to_nutrient_values(per_100g)
            trace.taco_confidence = estimate.get("confidence", 0.3)
            trace.reasoning = estimate.get("reasoning", "Estimativa baseada em conhecimento geral do LLM")
            return trace
    except Exception as exc:
        logger.warning("LLM estimate failed for '%s': %s", ingredient_name, exc)

    # Nothing worked
    trace.source = "llm_estimate"
    trace.reasoning = "Nenhuma fonte confiável encontrada"
    trace.taco_confidence = 0.1
    return trace


async def build_nutrition_trace(
    session: AsyncSession,
    ingredients_with_grams: list[dict],
    taco_nutrition_data: dict | None,
    image_detail: ImageDetailResult | None,
) -> NutritionCalculationTrace:
    """Build the full nutrition calculation trace for all ingredients in a meal.

    Args:
        session: Neo4j session
        ingredients_with_grams: list of {"name": str, "grams": float|None}
        taco_nutrition_data: result from get_meal_nutrition (with per-ingredient nutrients)
        image_detail: result from extract_image_detail
    """
    from datetime import datetime, timezone

    taco_by_ingredient: dict[str, list[dict]] = {}
    if taco_nutrition_data and taco_nutrition_data.get("ingredients"):
        for ing_data in taco_nutrition_data["ingredients"]:
            ing_name = (ing_data.get("ingredient") or "").lower()
            if ing_name:
                taco_by_ingredient[ing_name] = ing_data.get("nutrients") or []

    traces: list[IngredientTrace] = []
    sources_used: set[str] = set()

    for ing in ingredients_with_grams:
        name = ing.get("name", "")
        grams = ing.get("grams")
        taco_nuts = taco_by_ingredient.get(name.lower(), [])

        trace = await resolve_ingredient_source(
            session, name, grams, image_detail, taco_nuts if taco_nuts else None
        )
        traces.append(trace)
        sources_used.add(trace.source)

    avg_confidence = (
        sum(t.taco_confidence or 0 for t in traces) / len(traces)
        if traces else 0.0
    )

    return NutritionCalculationTrace(
        ingredient_traces=traces,
        reconciliation_notes=[],
        sources_used=sorted(sources_used),
        overall_confidence=round(avg_confidence, 2),
        analyzed_at=datetime.now(timezone.utc).isoformat(),
    )
