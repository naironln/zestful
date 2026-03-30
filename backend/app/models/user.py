from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Literal


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: Literal["patient", "nutritionist"] = "patient"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class LinkRequestOut(BaseModel):
    id: str
    status: Literal["pending", "accepted", "rejected"]
    created_at: datetime
    nutritionist_id: str
    nutritionist_name: str
    nutritionist_email: str


class OutboundLinkRequestOut(BaseModel):
    id: str
    status: Literal["pending", "accepted", "rejected"]
    created_at: datetime
    patient_id: str
    patient_name: str
    patient_email: str


class LinkRequestAction(BaseModel):
    action: Literal["accept", "reject"]
