from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token
from app.db.neo4j_driver import get_driver

bearer_scheme = HTTPBearer()


async def get_session():
    driver = get_driver()
    async with driver.session() as session:
        yield session


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    session=Depends(get_session),
):
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await session.run("MATCH (u:User {id: $id}) RETURN u", id=user_id)
    record = await result.single()
    if not record:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return dict(record["u"])


async def require_nutritionist(current_user=Depends(get_current_user)):
    if current_user.get("role") != "nutritionist":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nutritionist access required")
    return current_user


async def require_patient(current_user=Depends(get_current_user)):
    if current_user.get("role") != "patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient access required")
    return current_user
