from fastapi import APIRouter, Depends, HTTPException
from neo4j import AsyncSession

from app.dependencies import get_session, require_patient
from app.models.user import LinkRequestOut, LinkRequestAction
from app.db.queries.user_queries import (
    get_pending_requests_for_patient,
    respond_to_link_request,
)

router = APIRouter(prefix="/patient", tags=["patient"])


@router.get("/link-requests", response_model=list[LinkRequestOut])
async def list_link_requests(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_patient),
):
    requests = await get_pending_requests_for_patient(session, current_user["id"])
    return [LinkRequestOut(**r) for r in requests]


@router.post("/link-requests/{request_id}/respond", status_code=200)
async def respond_link_request(
    request_id: str,
    data: LinkRequestAction,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_patient),
):
    action_map = {"accept": "accepted", "reject": "rejected"}
    result = await respond_to_link_request(
        session, request_id, current_user["id"], action_map[data.action]
    )
    if not result:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada ou já respondida.")
    return result
