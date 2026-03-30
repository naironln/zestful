import uuid
from datetime import datetime, date, time
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from neo4j import AsyncSession

from app.dependencies import get_session, get_current_user
from app.models.alcohol import AlcoholEntryCreate, AlcoholEntryOut, AlcoholDaySummary
from app.db.queries.alcohol_queries import (
    create_alcohol_entry,
    get_alcohol_entries_by_range,
    delete_alcohol_entry,
)
from app.services.alcohol_service import group_into_day_summaries

router = APIRouter(prefix="/alcohol", tags=["alcohol"])

BRASILIA = ZoneInfo("America/Sao_Paulo")


@router.post("", response_model=AlcoholEntryOut, status_code=201)
async def log_alcohol(
    data: AlcoholEntryCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    today_brasilia = datetime.now(BRASILIA).date().isoformat()
    entry_date = data.date if data.date else today_brasilia

    consumed_at = datetime.combine(
        date.fromisoformat(entry_date),
        time(12, 0),
        BRASILIA,
    ).isoformat()

    record = await create_alcohol_entry(
        session,
        {
            "user_id": current_user["id"],
            "id": str(uuid.uuid4()),
            "doses": data.doses,
            "notes": data.notes,
            "consumed_at": consumed_at,
            "date": entry_date,
        },
    )

    from app.services.alcohol_service import _alcohol_record_to_out
    return _alcohol_record_to_out(record)


@router.get("", response_model=list[AlcoholDaySummary])
async def list_alcohol(
    start: str,
    end: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    records = await get_alcohol_entries_by_range(session, current_user["id"], start, end)
    return group_into_day_summaries(records)


@router.delete("/{entry_id}", status_code=204)
async def remove_alcohol(
    entry_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    deleted = await delete_alcohol_entry(session, entry_id, current_user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
