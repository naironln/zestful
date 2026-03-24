import uuid

from fastapi import HTTPException, status
from neo4j import AsyncSession

from app.core.security import hash_password, verify_password, create_access_token
from app.db.queries.user_queries import create_user, get_user_by_email
from app.models.user import UserCreate, UserLogin, UserOut, TokenResponse


async def register_user(session: AsyncSession, data: UserCreate) -> TokenResponse:
    existing = await get_user_by_email(session, data.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user_data = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "role": data.role,
    }
    user = await create_user(session, user_data)
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return TokenResponse(
        access_token=token,
        user=UserOut(id=user["id"], email=user["email"], name=user["name"], role=user["role"]),
    )


async def login_user(session: AsyncSession, data: UserLogin) -> TokenResponse:
    user = await get_user_by_email(session, data.email)
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return TokenResponse(
        access_token=token,
        user=UserOut(id=user["id"], email=user["email"], name=user["name"], role=user["role"]),
    )
