"""
Seed script: loads TACO JSON data into Neo4j.

Usage:
    python -m app.db.seed.seed_taco          (from backend/)
    docker compose exec backend python -m app.db.seed.seed_taco
"""

import asyncio
import json
from pathlib import Path

from neo4j import AsyncGraphDatabase

# ── Nutrient definitions ────────────────────────────────────────────
# Maps JSON key -> (display name, unit)
NUTRIENT_MAP: dict[str, tuple[str, str]] = {
    "energy_kcal":       ("Energia", "kcal"),
    "energy_kj":         ("Energia", "kJ"),
    "protein_g":         ("Proteína", "g"),
    "lipid_g":           ("Lipídios", "g"),
    "cholesterol_mg":    ("Colesterol", "mg"),
    "carbohydrate_g":    ("Carboidratos", "g"),
    "fiber_g":           ("Fibra alimentar", "g"),
    "calcium_mg":        ("Cálcio", "mg"),
    "magnesium_mg":      ("Magnésio", "mg"),
    "manganese_mg":      ("Manganês", "mg"),
    "phosphorus_mg":     ("Fósforo", "mg"),
    "iron_mg":           ("Ferro", "mg"),
    "sodium_mg":         ("Sódio", "mg"),
    "potassium_mg":      ("Potássio", "mg"),
    "copper_mg":         ("Cobre", "mg"),
    "zinc_mg":           ("Zinco", "mg"),
    "retinol_mcg":       ("Retinol", "mcg"),
    "thiamine_mg":       ("Tiamina (B1)", "mg"),
    "riboflavin_mg":     ("Riboflavina (B2)", "mg"),
    "pyridoxine_mg":     ("Piridoxina (B6)", "mg"),
    "niacin_mg":         ("Niacina", "mg"),
    "vitaminC_mg":       ("Vitamina C", "mg"),
    "saturated_g":       ("Ácidos graxos saturados", "g"),
    "monounsaturated_g": ("Ácidos graxos monoinsaturados", "g"),
    "polyunsaturated_g": ("Ácidos graxos poli-insaturados", "g"),
}


def _parse_value(raw) -> float | None:
    """Convert TACO values to float. Returns None for NA, Tr, or empty."""
    if raw is None or raw == "" or raw == "NA" or raw == "Tr":
        return None
    try:
        return float(raw)
    except (ValueError, TypeError):
        return None


async def seed(neo4j_uri: str, neo4j_user: str, neo4j_password: str) -> None:
    data_path = Path(__file__).parent / "taco_raw.json"
    with open(data_path, encoding="utf-8") as f:
        foods = json.load(f)

    driver = AsyncGraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))

    try:
        async with driver.session() as session:
            # 1) Create Nutrient nodes
            print(f"Creating {len(NUTRIENT_MAP)} Nutrient nodes...")
            for key, (name, unit) in NUTRIENT_MAP.items():
                await session.run(
                    """
                    MERGE (n:Nutrient {key: $key})
                    ON CREATE SET n.name = $name, n.unit = $unit
                    """,
                    key=key, name=name, unit=unit,
                )

            # 2) Create FoodCategory and Food nodes with relationships (batched)
            print(f"Creating {len(foods)} Food nodes with categories and nutrients...")
            batch_size = 50
            for i in range(0, len(foods), batch_size):
                batch = foods[i : i + batch_size]
                items = []
                for food in batch:
                    nutrients = {}
                    for key in NUTRIENT_MAP:
                        val = _parse_value(food.get(key))
                        if val is not None:
                            nutrients[key] = val

                    items.append({
                        "taco_id": food["id"],
                        "name": food["description"],
                        "name_lower": food["description"].lower(),
                        "category": food["category"],
                        "humidity": _parse_value(food.get("humidity_percents")),
                        "nutrients": nutrients,
                    })

                await session.run(
                    """
                    UNWIND $items AS item
                    MERGE (fc:FoodCategory {name: item.category})
                    MERGE (f:Food {taco_id: item.taco_id})
                    ON CREATE SET
                        f.name       = item.name,
                        f.name_lower = item.name_lower,
                        f.humidity   = item.humidity
                    MERGE (f)-[:BELONGS_TO]->(fc)
                    WITH f, item
                    UNWIND keys(item.nutrients) AS nkey
                    MATCH (n:Nutrient {key: nkey})
                    MERGE (f)-[r:HAS_NUTRIENT]->(n)
                    ON CREATE SET r.per_100g = item.nutrients[nkey]
                    """,
                    items=items,
                )
                print(f"  ... {min(i + batch_size, len(foods))}/{len(foods)}")

        print("TACO seed complete!")
    finally:
        await driver.close()


def main() -> None:
    import os
    from dotenv import load_dotenv

    load_dotenv()

    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "zestful123")

    asyncio.run(seed(neo4j_uri, neo4j_user, neo4j_password))


if __name__ == "__main__":
    main()
