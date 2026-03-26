#!/usr/bin/env python3
"""
Remove MealEntry nodes whose dish_name matches "unknown dish" (case-insensitive)
for a given user, and delete associated image files under MEDIA_DIR.

Usage (from backend/, with venv and .env):
  python -m scripts.cleanup_unknown_meals --email you@example.com
  python -m scripts.cleanup_unknown_meals --email you@example.com --dry-run

Requires JWT / DB env the same as the API (NEO4J_*, MEDIA_DIR).
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

# Allow running as script or module
_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app.config import settings
from app.db.neo4j_driver import close_driver, init_driver, get_driver
from app.services.meal_service import _remove_meal_image_file


async def run(email: str, dry_run: bool) -> None:
    await init_driver()
    try:
        driver = get_driver()
        async with driver.session() as session:
            result = await session.run(
                """
                MATCH (u:User {email: $email})-[:LOGGED]->(m:MealEntry)
                WHERE toLower(trim(m.dish_name)) = 'unknown dish'
                RETURN m.id AS id, m.image_path AS image_path
                """,
                email=email,
            )
            rows = [dict(r) async for r in result]
        if not rows:
            print("No matching meals found.")
            return
        print(f"Found {len(rows)} meal(s) with dish_name 'Unknown Dish' for {email}.")
        for r in rows:
            print(f"  - {r['id']}  image_path={r['image_path']!r}")
        if dry_run:
            print("Dry run: no changes.")
            return
        async with driver.session() as session:
            await session.run(
                """
                MATCH (u:User {email: $email})-[:LOGGED]->(m:MealEntry)
                WHERE toLower(trim(m.dish_name)) = 'unknown dish'
                DETACH DELETE m
                """,
                email=email,
            )
        for r in rows:
            path = r["image_path"]
            if path:
                _remove_meal_image_file(str(path))
        print("Deleted.")
    finally:
        await close_driver()


def main() -> None:
    p = argparse.ArgumentParser(description="Delete Unknown Dish meals for one user.")
    p.add_argument("--email", required=True, help="User email (must exist in Neo4j)")
    p.add_argument("--dry-run", action="store_true", help="Only list matches")
    args = p.parse_args()
    asyncio.run(run(args.email, args.dry_run))


if __name__ == "__main__":
    main()
