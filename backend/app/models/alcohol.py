from pydantic import BaseModel, Field
from datetime import datetime


class AlcoholEntryCreate(BaseModel):
    doses: int = Field(ge=1)
    notes: str | None = None
    date: str | None = None  # yyyy-MM-dd; default = hoje em Brasília


class AlcoholEntryOut(BaseModel):
    id: str
    doses: int
    notes: str | None
    consumed_at: datetime
    logged_at: datetime


class AlcoholDaySummary(BaseModel):
    date: str  # "yyyy-MM-dd"
    total_doses: int
    entries: list[AlcoholEntryOut]
