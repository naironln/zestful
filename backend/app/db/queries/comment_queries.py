import uuid
from datetime import datetime
from neo4j import AsyncSession
from fastapi import HTTPException


def _normalize_comment(c: dict, nutritionist_name: str) -> dict:
    """Convert Neo4j DateTime fields to Python datetime and fill defaults."""
    for field in ("created_at", "updated_at"):
        if hasattr(c.get(field), "to_native"):
            c[field] = c[field].to_native()
    c["nutritionist_name"] = nutritionist_name
    c.setdefault("week_start", None)
    return c


async def create_meal_comment(
    session: AsyncSession,
    nutritionist_id: str,
    patient_id: str,
    meal_id: str,
    content: str,
) -> dict:
    """Create a comment on a meal. Verifies that nutritionist supervises patient and patient owns meal."""
    comment_id = str(uuid.uuid4())
    result = await session.run(
        """
        MATCH (n:User {id: $nutritionist_id})-[:SUPERVISES]->(p:User {id: $patient_id})
        MATCH (p)-[:LOGGED]->(m:MealEntry {id: $meal_id})
        CREATE (c:Comment {
            id: $comment_id,
            content: $content,
            comment_type: 'meal',
            created_at: datetime()
        })
        CREATE (n)-[:WROTE]->(c)
        CREATE (c)-[:ON_MEAL]->(m)
        CREATE (c)-[:FOR_PATIENT]->(p)
        RETURN c, n.name AS nutritionist_name
        """,
        nutritionist_id=nutritionist_id,
        patient_id=patient_id,
        meal_id=meal_id,
        comment_id=comment_id,
        content=content,
    )
    record = await result.single()
    if not record:
        raise HTTPException(status_code=404, detail="Meal not found or access denied")
    return _normalize_comment(dict(record["c"]), record["nutritionist_name"])


async def create_week_comment(
    session: AsyncSession,
    nutritionist_id: str,
    patient_id: str,
    week_start: str,
    content: str,
) -> dict:
    """Create a weekly comment for a patient. Verifies SUPERVISES relationship."""
    comment_id = str(uuid.uuid4())
    result = await session.run(
        """
        MATCH (n:User {id: $nutritionist_id})-[:SUPERVISES]->(p:User {id: $patient_id})
        CREATE (c:Comment {
            id: $comment_id,
            content: $content,
            comment_type: 'week',
            week_start: $week_start,
            created_at: datetime()
        })
        CREATE (n)-[:WROTE]->(c)
        CREATE (c)-[:FOR_PATIENT]->(p)
        RETURN c, n.name AS nutritionist_name
        """,
        nutritionist_id=nutritionist_id,
        patient_id=patient_id,
        comment_id=comment_id,
        content=content,
        week_start=week_start,
    )
    record = await result.single()
    if not record:
        raise HTTPException(status_code=404, detail="Patient not found or access denied")
    return _normalize_comment(dict(record["c"]), record["nutritionist_name"])


async def get_meal_comments(
    session: AsyncSession,
    meal_id: str,
    viewer_id: str,
) -> list[dict]:
    """
    Get comments for a meal.
    Accessible by the patient who owns the meal OR a nutritionist who supervises that patient.
    """
    result = await session.run(
        """
        MATCH (c:Comment)-[:ON_MEAL]->(m:MealEntry {id: $meal_id})
        MATCH (n:User)-[:WROTE]->(c)
        WHERE
            (m)<-[:LOGGED]-(:User {id: $viewer_id})
            OR ((:User {id: $viewer_id})-[:SUPERVISES]->(:User)-[:LOGGED]->(m))
        RETURN c, n.name AS nutritionist_name
        ORDER BY c.created_at ASC
        """,
        meal_id=meal_id,
        viewer_id=viewer_id,
    )
    records = await result.data()
    return [_normalize_comment(dict(r["c"]), r["nutritionist_name"]) for r in records]


async def get_week_comments(
    session: AsyncSession,
    patient_id: str,
    week_start: str,
    viewer_id: str,
) -> list[dict]:
    """
    Get week comments for a patient.
    Accessible by the patient themselves OR a nutritionist who supervises them.
    """
    result = await session.run(
        """
        MATCH (c:Comment {comment_type: 'week', week_start: $week_start})-[:FOR_PATIENT]->(p:User {id: $patient_id})
        MATCH (n:User)-[:WROTE]->(c)
        WHERE
            p.id = $viewer_id
            OR (:User {id: $viewer_id})-[:SUPERVISES]->(p)
        RETURN c, n.name AS nutritionist_name
        ORDER BY c.created_at ASC
        """,
        patient_id=patient_id,
        week_start=week_start,
        viewer_id=viewer_id,
    )
    records = await result.data()
    return [_normalize_comment(dict(r["c"]), r["nutritionist_name"]) for r in records]


async def get_meal_comments_by_date_range(
    session: AsyncSession,
    patient_id: str,
    start: str,
    end: str,
    viewer_id: str,
) -> dict[str, list[dict]]:
    """
    Get all meal comments for a patient's meals in a date range.
    Returns a dict mapping meal_id -> list of comments.
    Accessible by the patient or a supervising nutritionist.
    """
    result = await session.run(
        """
        MATCH (p:User {id: $patient_id})-[:LOGGED]->(m:MealEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= date($start) AND day.date <= date($end)
        MATCH (c:Comment)-[:ON_MEAL]->(m)
        MATCH (n:User)-[:WROTE]->(c)
        WHERE
            p.id = $viewer_id
            OR (:User {id: $viewer_id})-[:SUPERVISES]->(p)
        RETURN m.id AS meal_id, c, n.name AS nutritionist_name
        ORDER BY c.created_at ASC
        """,
        patient_id=patient_id,
        start=start,
        end=end,
        viewer_id=viewer_id,
    )
    grouped: dict[str, list[dict]] = {}
    async for record in result:
        meal_id = record["meal_id"]
        comment = _normalize_comment(dict(record["c"]), record["nutritionist_name"])
        grouped.setdefault(meal_id, []).append(comment)
    return grouped


async def update_comment(
    session: AsyncSession,
    nutritionist_id: str,
    comment_id: str,
    content: str,
) -> dict:
    """Update a comment. Only the author (nutritionist) can edit."""
    result = await session.run(
        """
        MATCH (n:User {id: $nutritionist_id})-[:WROTE]->(c:Comment {id: $comment_id})
        SET c.content = $content, c.updated_at = datetime()
        RETURN c, n.name AS nutritionist_name
        """,
        nutritionist_id=nutritionist_id,
        comment_id=comment_id,
        content=content,
    )
    record = await result.single()
    if not record:
        raise HTTPException(status_code=404, detail="Comment not found or access denied")
    return _normalize_comment(dict(record["c"]), record["nutritionist_name"])


async def delete_comment(
    session: AsyncSession,
    nutritionist_id: str,
    comment_id: str,
) -> None:
    """Delete a comment. Only the author (nutritionist) can delete."""
    result = await session.run(
        """
        MATCH (n:User {id: $nutritionist_id})-[:WROTE]->(c:Comment {id: $comment_id})
        DETACH DELETE c
        RETURN count(c) AS deleted
        """,
        nutritionist_id=nutritionist_id,
        comment_id=comment_id,
    )
    record = await result.single()
    if not record or record["deleted"] == 0:
        raise HTTPException(status_code=404, detail="Comment not found or access denied")
