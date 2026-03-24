from neo4j import AsyncSession


async def create_user(session: AsyncSession, user_data: dict) -> dict:
    result = await session.run(
        """
        CREATE (u:User {
            id: $id,
            email: $email,
            name: $name,
            password_hash: $password_hash,
            role: $role,
            created_at: datetime()
        })
        RETURN u
        """,
        **user_data,
    )
    record = await result.single()
    return dict(record["u"])


async def get_user_by_email(session: AsyncSession, email: str) -> dict | None:
    result = await session.run("MATCH (u:User {email: $email}) RETURN u", email=email)
    record = await result.single()
    return dict(record["u"]) if record else None


async def get_user_by_id(session: AsyncSession, user_id: str) -> dict | None:
    result = await session.run("MATCH (u:User {id: $id}) RETURN u", id=user_id)
    record = await result.single()
    return dict(record["u"]) if record else None


async def get_patients_for_nutritionist(session: AsyncSession, nutritionist_id: str) -> list[dict]:
    result = await session.run(
        """
        MATCH (n:User {id: $nutritionist_id})-[:SUPERVISES]->(p:User)
        RETURN p
        ORDER BY p.name
        """,
        nutritionist_id=nutritionist_id,
    )
    return [dict(r["p"]) async for r in result]


async def link_patient_to_nutritionist(session: AsyncSession, nutritionist_id: str, patient_id: str) -> None:
    await session.run(
        """
        MATCH (n:User {id: $nutritionist_id}), (p:User {id: $patient_id})
        MERGE (n)-[:SUPERVISES]->(p)
        """,
        nutritionist_id=nutritionist_id,
        patient_id=patient_id,
    )
