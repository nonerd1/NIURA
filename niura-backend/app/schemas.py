from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List, Optional

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleToken(BaseModel):
    token: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Metric schemas
class MetricBase(BaseModel):
    stress: float
    focus: float
    mental_readiness: float

class MetricCreate(MetricBase):
    pass

class Metric(MetricBase):
    id: int
    user_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

# User with metrics
class UserWithMetrics(User):
    metrics: List[Metric] = [] 