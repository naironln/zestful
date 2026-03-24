from fastapi import APIRouter, Depends
from neo4j import AsyncSession

from app.dependencies import get_session
from app.models.user import UserCreate, UserLogin, TokenResponse
from app.services.user_service import register_user, login_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: UserCreate, session: AsyncSession = Depends(get_session)):
    return await register_user(session, data)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, session: AsyncSession = Depends(get_session)):
    return await login_user(session, data)
