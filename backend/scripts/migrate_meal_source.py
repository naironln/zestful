"""
Migration: convert is_homemade boolean to meal_source enum on MealEntry nodes.

Converts:
  is_homemade = true  -> meal_source = "homemade"
  is_homemade = false -> meal_source = "restaurant"
  (missing)           -> meal_source = "homemade"

Then removes the old is_homemade property.

Usage:
    cd backend
    python -m scripts.migrate_meal_source
"""

import asyncio
import logging

from neo4j import AsyncGraphDatabase

from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


async def migrate() -> None:
    driver = AsyncGraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )

    async with driver.session() as session:
        # Convert is_homemade=true -> meal_source="homemade"
        result = await session.run(
            """
            MATCH (m:MealEntry)
            WHERE m.is_homemade = true AND m.meal_source IS NULL
            SET m.meal_source = 'homemade'
            REMOVE m.is_homemade
            RETURN count(m) AS count
            """
        )
        record = await result.single()
        homemade_count = record["count"] if record else 0
        logger.info("Converted %d is_homemade=true -> meal_source='homemade'", homemade_count)

        # Convert is_homemade=false -> meal_source="restaurant"
        result = await session.run(
            """
            MATCH (m:MealEntry)
            WHERE m.is_homemade = false AND m.meal_source IS NULL
            SET m.meal_source = 'restaurant'
            REMOVE m.is_homemade
            RETURN count(m) AS count
            """
        )
        record = await result.single()
        not_homemade_count = record["count"] if record else 0
        logger.info("Converted %d is_homemade=false -> meal_source='restaurant'", not_homemade_count)

        # Default any remaining without meal_source
        result = await session.run(
            """
            MATCH (m:MealEntry)
            WHERE m.meal_source IS NULL
            SET m.meal_source = 'homemade'
            REMOVE m.is_homemade
            RETURN count(m) AS count
            """
        )
        record = await result.single()
        default_count = record["count"] if record else 0
        logger.info("Defaulted %d remaining -> meal_source='homemade'", default_count)

    await driver.close()
    total = homemade_count + not_homemade_count + default_count
    logger.info("Migration complete: %d total nodes updated.", total)


if __name__ == "__main__":
    asyncio.run(migrate())
