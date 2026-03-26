"""
Maps Ingredient nodes to TACO Food nodes using LLM (Claude Haiku → GPT-4o-mini fallback).

When a new MealEntry is created, its ingredients are checked.
If an Ingredient hasn't been mapped yet, the LLM picks the best TACO match.
The result is persisted as an (:Ingredient)-[:MAPS_TO]->(:Food) relationship.
"""

import logging

from neo4j import AsyncSession

from app.services.llm_service import text_call

logger = logging.getLogger(__name__)

MAPPING_SYSTEM_PROMPT = """Você é um especialista em nutrição brasileira e na Tabela Brasileira de Composição de Alimentos (TACO).

Sua tarefa é encontrar o alimento TACO que melhor representa um ingrediente para rastreamento nutricional. O objetivo é a aproximação nutricional mais precisa, não necessariamente o nome exato.

Regras:
1. Prefira formas "cozido" para ingredientes normalmente consumidos cozidos (arroz, feijão, carnes, legumes)
2. Para ingredientes internacionais sem equivalente exato, use o item TACO com perfil nutricional mais próximo
3. Para cortes de carne bovina, priorize o corte específico; caso contrário, use o corte mais similar em teor de gordura
4. Para pratos compostos (feijoada, estrogonofe), procure em Alimentos preparados
5. Confiança abaixo de 0.3 indica que não há correspondência adequada

Responda APENAS com JSON válido, sem markdown:
{"taco_id": <int>, "confidence": <float 0.0-1.0>}

Sem correspondência adequada:
{"taco_id": null, "confidence": 0.0}"""

DECOMPOSITION_SYSTEM_PROMPT = """Você é um especialista em nutrição brasileira e na Tabela Brasileira de Composição de Alimentos (TACO).

Quando um alimento processado ou preparado não tem equivalente direto na TACO (ex: sorvete artesanal, prato regional composto), decomponha-o em ingredientes base disponíveis na TACO com suas frações em peso por 100g do alimento final.

Regras:
1. As frações devem somar exatamente 1.0
2. Use no máximo 5 ingredientes base
3. Reflita a composição nutricional real — ex: sorvete tem gordura de leite/creme, não só açúcar
4. Prefira ingredientes em forma consumida (integral, pasteurizado, etc.)
5. Confiança abaixo de 0.3 indica impossibilidade de decomposição adequada

Responda APENAS com JSON válido, sem markdown:
{"components": [{"taco_id": <int>, "fraction": <float>}], "confidence": <float 0.0-1.0>}

Sem decomposição adequada:
{"components": [], "confidence": 0.0}"""


async def _get_taco_foods(session: AsyncSession) -> list[dict]:
    """Fetch all TACO food names for LLM prompt."""
    result = await session.run(
        """
        MATCH (f:Food)-[:BELONGS_TO]->(fc:FoodCategory)
        RETURN f.taco_id AS taco_id, f.name AS name, fc.name AS category
        ORDER BY f.name
        """
    )
    foods = []
    async for record in result:
        foods.append({
            "taco_id": record["taco_id"],
            "name": record["name"],
            "category": record["category"],
        })
    return foods


async def _ask_llm_for_mapping(
    ingredient_name: str, taco_foods: list[dict], cuisine_origin: str = "brasileira"
) -> dict:
    """Ask LLM to pick the best TACO food match for an ingredient."""
    food_lines = "\n".join(
        f"  {f['taco_id']}: {f['name']} ({f['category']})"
        for f in taco_foods
    )

    prompt = (
        f"Ingrediente: \"{ingredient_name}\"\n"
        f"Origem culinária do prato: {cuisine_origin}\n\n"
        f"Alimentos TACO disponíveis:\n{food_lines}"
    )

    return await text_call(MAPPING_SYSTEM_PROMPT, prompt)


async def _ask_llm_for_decomposition(
    ingredient_name: str, taco_foods: list[dict], cuisine_origin: str = "brasileira"
) -> dict:
    """Ask LLM to decompose an ingredient into weighted TACO food components."""
    food_lines = "\n".join(
        f"  {f['taco_id']}: {f['name']} ({f['category']})"
        for f in taco_foods
    )

    prompt = (
        f"Ingrediente a decompor: \"{ingredient_name}\"\n"
        f"Origem culinária do prato: {cuisine_origin}\n\n"
        f"Alimentos TACO disponíveis:\n{food_lines}"
    )

    return await text_call(DECOMPOSITION_SYSTEM_PROMPT, prompt, max_tokens=512)


async def _persist_mapping(
    session: AsyncSession, name: str, taco_id: int | None, confidence: float
) -> None:
    if taco_id is not None and confidence >= 0.3:
        await session.run(
            """
            MATCH (i:Ingredient {name: $name})
            MATCH (f:Food {taco_id: $taco_id})
            MERGE (i)-[r:MAPS_TO]->(f)
            ON CREATE SET r.confidence = $confidence, r.fraction = 1.0, r.mapped_at = datetime()
            SET i.mapped = true
            """,
            name=name, taco_id=taco_id, confidence=confidence,
        )
    else:
        await session.run(
            "MATCH (i:Ingredient {name: $name}) SET i.mapped = false",
            name=name,
        )


async def _persist_decomposition(
    session: AsyncSession, name: str, components: list[dict], confidence: float
) -> None:
    """Persist multiple MAPS_TO relationships with fraction weights for decomposed ingredients.
    Deletes any pre-existing direct mappings first to avoid double-counting.
    """
    await session.run(
        "MATCH (i:Ingredient {name: $name})-[r:MAPS_TO]->() DELETE r",
        name=name,
    )
    for comp in components:
        taco_id = comp.get("taco_id")
        fraction = comp.get("fraction", 0)
        if taco_id is None or fraction <= 0:
            continue
        await session.run(
            """
            MATCH (i:Ingredient {name: $name})
            MATCH (f:Food {taco_id: $taco_id})
            MERGE (i)-[r:MAPS_TO]->(f)
            ON CREATE SET r.confidence = $confidence, r.fraction = $fraction, r.mapped_at = datetime()
            SET i.mapped = true
            """,
            name=name, taco_id=taco_id, confidence=confidence, fraction=fraction,
        )
    await session.run(
        "MATCH (i:Ingredient {name: $name}) SET i.mapped = true",
        name=name,
    )


async def map_ingredient_to_food(
    session: AsyncSession, ingredient_name: str, cuisine_origin: str = "brasileira"
) -> int | None:
    """
    Map a single ingredient to a TACO Food node (or decompose into weighted components).
    Returns taco_id of a direct mapping, None if decomposed or unmappable.
    """
    name = ingredient_name.lower()

    # Check if already mapped (direct or decomposed)
    result = await session.run(
        "MATCH (i:Ingredient {name: $name})-[:MAPS_TO]->(f:Food) RETURN f.taco_id AS taco_id LIMIT 1",
        name=name,
    )
    record = await result.single()
    if record:
        return record["taco_id"]

    taco_foods = await _get_taco_foods(session)
    if not taco_foods:
        return None

    # Step 1: try direct mapping
    try:
        mapping = await _ask_llm_for_mapping(name, taco_foods, cuisine_origin)
        taco_id = mapping.get("taco_id")
        confidence = mapping.get("confidence", 0)
        if taco_id is not None and confidence >= 0.3:
            await _persist_mapping(session, name, taco_id, confidence)
            return taco_id
    except Exception as exc:
        logger.warning("LLM direct mapping failed for '%s': %s", name, exc)

    # Step 2: fallback — decompose into weighted TACO components
    logger.info("Trying decomposition fallback for '%s'", name)
    try:
        decomp = await _ask_llm_for_decomposition(name, taco_foods, cuisine_origin)
        components = decomp.get("components", [])
        confidence = decomp.get("confidence", 0)
        if components and confidence >= 0.3:
            await _persist_decomposition(session, name, components, confidence)
            return None  # decomposed — no single taco_id
    except Exception as exc:
        logger.warning("LLM decomposition failed for '%s': %s", name, exc)

    # Both strategies failed
    await session.run(
        "MATCH (i:Ingredient {name: $name}) SET i.mapped = false",
        name=name,
    )
    return None


async def map_unmapped_ingredients(session: AsyncSession) -> dict:
    """Batch-map all Ingredient nodes that haven't been mapped yet, including failed ones."""
    result = await session.run(
        """
        MATCH (i:Ingredient)
        WHERE NOT (i)-[:MAPS_TO]->(:Food)
        RETURN i.name AS name
        """
    )

    ingredients = []
    async for record in result:
        ingredients.append(record["name"])

    if not ingredients:
        return {"total": 0, "mapped": 0, "failed": 0}

    taco_foods = await _get_taco_foods(session)

    mapped = 0
    failed = 0
    for name in ingredients:
        # Step 1: try direct mapping
        try:
            mapping = await _ask_llm_for_mapping(name, taco_foods)
            taco_id = mapping.get("taco_id")
            confidence = mapping.get("confidence", 0)
            if taco_id is not None and confidence >= 0.3:
                await _persist_mapping(session, name, taco_id, confidence)
                mapped += 1
                continue
        except Exception as exc:
            logger.warning("LLM direct mapping failed for '%s': %s", name, exc)

        # Step 2: fallback decomposition
        try:
            decomp = await _ask_llm_for_decomposition(name, taco_foods)
            components = decomp.get("components", [])
            confidence = decomp.get("confidence", 0)
            if components and confidence >= 0.3:
                await _persist_decomposition(session, name, components, confidence)
                mapped += 1
                continue
        except Exception as exc:
            logger.warning("LLM decomposition failed for '%s': %s", name, exc)

        await session.run(
            "MATCH (i:Ingredient {name: $name}) SET i.mapped = false",
            name=name,
        )
        failed += 1

    return {"total": len(ingredients), "mapped": mapped, "failed": failed}
