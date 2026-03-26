from pydantic import BaseModel
from typing import Literal
from datetime import datetime


class CommentCreate(BaseModel):
    content: str


class WeekCommentCreate(BaseModel):
    week_start: str  # YYYY-MM-DD
    content: str


class CommentOut(BaseModel):
    id: str
    content: str
    comment_type: Literal["meal", "week"]
    created_at: datetime
    nutritionist_name: str
    week_start: str | None = None
