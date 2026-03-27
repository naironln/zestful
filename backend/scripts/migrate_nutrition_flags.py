"""
Migration: classify existing MealEntry nodes with nutrition flags.

For each MealEntry that lacks the new classification fields (has_vegetables, is_fruit,
is_dessert, is_ultra_processed, has_protein, meal_source), uses a text-only LLM
call (cheap, no vision) to classify based on the stored dish_name + ingredients.

Usage:
    cd backend
    python -m scripts.migrate_nutrition_flags
"""

import asyncio
import json
import logging

from neo4j import AsyncGraphDatabase

from app.config import settings
from app.services.llm_service import text_call

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

CLASSIFICATION_SYSTEM = (
    "Você é um assistente de classificação nutricional. Dado o nome de um prato e seus ingredientes, "
    "classifique a refeição nos campos booleanos solicitados. "
    "Responda SEMPRE com JSON válido apenas, sem markdown, sem explicações."
)

CLASSIFICATION_PROMPT = """Classifique esta refeição:

Prato: "{dish_name}"
Ingredientes: {ingredients}

Retorne um JSON com exatamente estes campos:
{{
  "has_vegetables": true | false,
  "is_fruit": true | false,
  "is_dessert": true | false,
  "is_ultra_processed": true | false,
  "has_protein": true | false,
  "meal_source": "homemade" | "restaurant" | "delivery"
}}

Regras:
- has_vegetables: true se houver verduras, legumes ou salada (folhas, tomate, cenoura, brócolis, etc.)
- is_fruit: true se a refeição for composta principalmente por fruta(s)
- is_dessert: true APENAS para doces/sobremesas (chocolate, bolo, sorvete, pudim, biscoito doce). NÃO: barra de proteína, iogurte, granola, frutas
- is_ultra_processed: true APENAS para ultraprocessados NOVA grupo 4 (refrigerante, salgadinho, nuggets, biscoito recheado, embutidos, macarrão instantâneo). NÃO: queijo, pão artesanal, conservas
- has_protein: true se houver fonte proteica (carne, frango, peixe, ovos, feijão, lentilha, tofu)
- meal_source: "homemade" se caseiro, "restaurant" se restaurante, "delivery" se delivery/marmita. Na dúvida, "homemade"

Retorne APENAS o JSON."""

BOOL_FIELDS = ("has_vegetables", "is_fruit", "is_dessert", "is_ultra_processed", "has_protein")
STR_FIELDS = ("meal_source",)
DEFAULTS = {"has_vegetables": False, "is_fruit": False, "is_dessert": False,
            "is_ultra_processed": False, "has_protein": False, "meal_source": "homemade"}


async def migrate() -> None:
    driver = AsyncGraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )

    async with driver.session() as session:
        result = await session.run(
            """
            MATCH (m:MealEntry)
            WHERE m.has_vegetables IS NULL
            OPTIONAL MATCH (m)-[:HAS_INGREDIENT]->(i:Ingredient)
            RETURN m.id AS id, m.dish_name AS dish_name,
                   m.raw_llm_response AS raw_llm, collect(i.name) AS ingredients
            """
        )
        records = [r async for r in result]

    total = len(records)
    logger.info("Found %d MealEntry nodes to classify.", total)

    if total == 0:
        await driver.close()
        return

    updated = 0
    failed = 0

    for i, record in enumerate(records, 1):
        meal_id = record["id"]
        dish_name = record["dish_name"] or "Unknown"

        ingredients = record["ingredients"] or []
        if not ingredients:
            raw = record["raw_llm"]
            if raw:
                try:
                    parsed = json.loads(raw) if isinstance(raw, str) else raw
                    ingredients = parsed.get("ingredients", [])
                except Exception:
                    pass

        ing_str = ", ".join(ingredients) if ingredients else "nenhum identificado"
        prompt = CLASSIFICATION_PROMPT.format(dish_name=dish_name, ingredients=ing_str)

        try:
            flags = await text_call(CLASSIFICATION_SYSTEM, prompt, max_tokens=256)
            clean = {k: bool(flags.get(k, DEFAULTS[k])) for k in BOOL_FIELDS}
            ms = flags.get("meal_source", DEFAULTS["meal_source"])
            clean["meal_source"] = ms if ms in ("homemade", "restaurant", "delivery") else "homemade"
        except Exception as exc:
            logger.warning("[%d/%d] LLM failed for %s (%s): %s — using defaults", i, total, meal_id, dish_name, exc)
            clean = dict(DEFAULTS)
            failed += 1

        async with driver.session() as session:
            await session.run(
                """
                MATCH (m:MealEntry {id: $id})
                SET m.has_vegetables = $has_vegetables,
                    m.is_fruit = $is_fruit,
                    m.is_dessert = $is_dessert,
                    m.is_ultra_processed = $is_ultra_processed,
                    m.has_protein = $has_protein,
                    m.meal_source = $meal_source
                """,
                id=meal_id,
                **clean,
            )

        updated += 1
        if i % 10 == 0 or i == total:
            logger.info("[%d/%d] Processed — %d updated, %d LLM failures (defaults applied).", i, total, updated, failed)

    await driver.close()
    logger.info("Migration complete: %d updated, %d used defaults.", updated, failed)


if __name__ == "__main__":
    asyncio.run(migrate())
