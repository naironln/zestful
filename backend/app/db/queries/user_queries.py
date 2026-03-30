import uuid
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


async def create_link_request(session: AsyncSession, nutritionist_id: str, patient_id: str) -> dict | None:
    request_id = str(uuid.uuid4())
    result = await session.run(
        """
        MATCH (n:User {id: $nutritionist_id}), (p:User {id: $patient_id})
        WHERE NOT EXISTS((n)-[:LINK_REQUEST {status: 'pending'}]->(p))
          AND NOT EXISTS((n)-[:SUPERVISES]->(p))
        CREATE (n)-[r:LINK_REQUEST {
            id: $request_id,
            status: 'pending',
            created_at: datetime()
        }]->(p)
        RETURN r, p.id AS patient_id, p.name AS patient_name, p.email AS patient_email
        """,
        nutritionist_id=nutritionist_id,
        patient_id=patient_id,
        request_id=request_id,
    )
    record = await result.single()
    if not record:
        return None
    r = dict(record["r"])
    return {
        "id": r["id"],
        "status": r["status"],
        "created_at": r["created_at"].to_native(),
        "patient_id": record["patient_id"],
        "patient_name": record["patient_name"],
        "patient_email": record["patient_email"],
    }


async def get_pending_requests_for_patient(session: AsyncSession, patient_id: str) -> list[dict]:
    result = await session.run(
        """
        MATCH (n:User)-[r:LINK_REQUEST {status: 'pending'}]->(p:User {id: $patient_id})
        RETURN r, n.id AS nutritionist_id, n.name AS nutritionist_name, n.email AS nutritionist_email
        ORDER BY r.created_at DESC
        """,
        patient_id=patient_id,
    )
    rows = []
    async for record in result:
        r = dict(record["r"])
        rows.append({
            "id": r["id"],
            "status": r["status"],
            "created_at": r["created_at"].to_native(),
            "nutritionist_id": record["nutritionist_id"],
            "nutritionist_name": record["nutritionist_name"],
            "nutritionist_email": record["nutritionist_email"],
        })
    return rows


async def respond_to_link_request(
    session: AsyncSession, request_id: str, patient_id: str, action: str
) -> dict | None:
    result = await session.run(
        """
        MATCH (n:User)-[r:LINK_REQUEST {id: $request_id, status: 'pending'}]->(p:User {id: $patient_id})
        SET r.status = $action
        FOREACH (_ IN CASE WHEN $action = 'accepted' THEN [1] ELSE [] END |
            MERGE (n)-[:SUPERVISES]->(p)
        )
        RETURN r, n.id AS nutritionist_id
        """,
        request_id=request_id,
        patient_id=patient_id,
        action=action,
    )
    record = await result.single()
    if not record:
        return None
    r = dict(record["r"])
    return {"id": r["id"], "status": r["status"]}


async def get_outbound_requests_for_nutritionist(session: AsyncSession, nutritionist_id: str) -> list[dict]:
    result = await session.run(
        """
        MATCH (n:User {id: $nutritionist_id})-[r:LINK_REQUEST {status: 'pending'}]->(p:User)
        RETURN r, p.id AS patient_id, p.name AS patient_name, p.email AS patient_email
        ORDER BY r.created_at DESC
        """,
        nutritionist_id=nutritionist_id,
    )
    rows = []
    async for record in result:
        r = dict(record["r"])
        rows.append({
            "id": r["id"],
            "status": r["status"],
            "created_at": r["created_at"].to_native(),
            "patient_id": record["patient_id"],
            "patient_name": record["patient_name"],
            "patient_email": record["patient_email"],
        })
    return rows
