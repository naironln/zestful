from neo4j import AsyncSession


async def create_alcohol_entry(session: AsyncSession, data: dict) -> dict:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})
        CREATE (a:AlcoholEntry {
            id: $id,
            doses: $doses,
            notes: $notes,
            consumed_at: datetime($consumed_at),
            logged_at: datetime()
        })
        MERGE (day:Day {date: date($date)})
        CREATE (u)-[:LOGGED_ALCOHOL]->(a)
        CREATE (a)-[:ON_DAY]->(day)
        RETURN a
        """,
        **data,
    )
    record = await result.single()
    return dict(record["a"])


async def get_alcohol_entries_by_range(
    session: AsyncSession,
    user_id: str,
    start: str,
    end: str,
) -> list[dict]:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED_ALCOHOL]->(a:AlcoholEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= date($start) AND day.date <= date($end)
        RETURN a, toString(day.date) AS date
        ORDER BY a.consumed_at DESC
        """,
        user_id=user_id,
        start=start,
        end=end,
    )
    records = []
    async for record in result:
        entry = dict(record["a"])
        entry["_date"] = record["date"]
        records.append(entry)
    return records


async def get_alcohol_entries_for_patient(
    session: AsyncSession,
    nutritionist_id: str,
    patient_id: str,
    start: str,
    end: str,
) -> list[dict]:
    result = await session.run(
        """
        MATCH (:User {id: $nutritionist_id})-[:SUPERVISES]->(p:User {id: $patient_id})
        MATCH (p)-[:LOGGED_ALCOHOL]->(a:AlcoholEntry)-[:ON_DAY]->(day:Day)
        WHERE day.date >= date($start) AND day.date <= date($end)
        RETURN a, toString(day.date) AS date
        ORDER BY a.consumed_at DESC
        """,
        nutritionist_id=nutritionist_id,
        patient_id=patient_id,
        start=start,
        end=end,
    )
    records = []
    async for record in result:
        entry = dict(record["a"])
        entry["_date"] = record["date"]
        records.append(entry)
    return records


async def delete_alcohol_entry(
    session: AsyncSession,
    entry_id: str,
    user_id: str,
) -> bool:
    result = await session.run(
        """
        MATCH (u:User {id: $user_id})-[:LOGGED_ALCOHOL]->(a:AlcoholEntry {id: $entry_id})
        WITH a, count(a) AS found
        DETACH DELETE a
        RETURN found
        """,
        entry_id=entry_id,
        user_id=user_id,
    )
    record = await result.single()
    return record is not None and record["found"] > 0
