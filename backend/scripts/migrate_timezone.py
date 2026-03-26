"""
Migration: correct timezone offset on existing MealEntry nodes.

Before this fix, eaten_at was stored with the wrong timezone assumption
(EXIF local time was treated as UTC, adding 3h). This script subtracts
3 hours from every MealEntry.eaten_at and recalculates the ON_DAY
relationship when the date changes.

Usage:
    cd backend
    python -m scripts.migrate_timezone
"""

import asyncio
from datetime import timedelta

from neo4j import AsyncGraphDatabase

from app.config import settings

OFFSET = timedelta(hours=3)  # subtract 3h (UTC → GMT-3)


async def migrate() -> None:
    driver = AsyncGraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )

    async with driver.session() as session:
        # Fetch all MealEntry nodes
        result = await session.run(
            "MATCH (m:MealEntry) RETURN m.id AS id, m.eaten_at AS eaten_at"
        )
        records = [r async for r in result]

    print(f"Found {len(records)} MealEntry nodes.")
    updated = 0
    date_changed = 0

    async with driver.session() as session:
        for record in records:
            meal_id = record["id"]
            eaten_at = record["eaten_at"]

            if eaten_at is None:
                continue

            # Convert Neo4j DateTime → Python datetime
            if hasattr(eaten_at, "to_native"):
                eaten_at_native = eaten_at.to_native()
            else:
                eaten_at_native = eaten_at

            corrected = eaten_at_native - OFFSET
            old_date = eaten_at_native.date()
            new_date = corrected.date()

            corrected_iso = corrected.isoformat()
            new_date_iso = new_date.isoformat()

            if old_date != new_date:
                # Date changed: update eaten_at, remove old ON_DAY, create new Day + relation
                await session.run(
                    """
                    MATCH (m:MealEntry {id: $id})-[r:ON_DAY]->()
                    DELETE r
                    """,
                    id=meal_id,
                )
                await session.run(
                    """
                    MATCH (m:MealEntry {id: $id})
                    SET m.eaten_at = datetime($eaten_at)
                    WITH m
                    MERGE (day:Day {date: date($date)})
                    CREATE (m)-[:ON_DAY]->(day)
                    """,
                    id=meal_id,
                    eaten_at=corrected_iso,
                    date=new_date_iso,
                )
                date_changed += 1
            else:
                # Only update eaten_at
                await session.run(
                    """
                    MATCH (m:MealEntry {id: $id})
                    SET m.eaten_at = datetime($eaten_at)
                    """,
                    id=meal_id,
                    eaten_at=corrected_iso,
                )

            updated += 1

    await driver.close()

    print(f"Updated {updated} entries ({date_changed} with date change).")
    print("Migration complete.")


if __name__ == "__main__":
    asyncio.run(migrate())
