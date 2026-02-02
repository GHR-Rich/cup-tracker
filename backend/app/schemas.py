from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = "investigator"


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


# Authentication schemas
class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: User


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = "contributor"


# Investigation schemas
class InvestigationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    brand: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = "active"


class InvestigationCreate(InvestigationBase):
    pass


class Investigation(InvestigationBase):
    id: int
    created_by: int
    start_date: datetime
    end_date: Optional[datetime] = None

    class Config:
        from_attributes = True


# Tracker schemas
class TrackerBase(BaseModel):
    name: str
    platform: str
    emoji: Optional[str] = None
    tracker_type: Optional[str] = "airtag"
    notes: Optional[str] = None


class TrackerCreate(TrackerBase):
    investigation_id: int


class Tracker(TrackerBase):
    id: int
    investigation_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Screenshot schemas
class ScreenshotBase(BaseModel):
    file_path: str
    file_name: str
    platform: Optional[str] = None
    ocr_confidence: Optional[Decimal] = None
    ocr_raw_text: Optional[str] = None


class Screenshot(ScreenshotBase):
    id: int
    location_id: int
    uploaded_at: Optional[datetime] = None  # CHANGED: Made optional

    class Config:
        from_attributes = True


# Location schemas
class LocationBase(BaseModel):
    address: str
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    location_type: Optional[str] = "unknown"
    screenshot_timestamp: Optional[datetime] = None
    last_seen_text: Optional[str] = None
    is_final_destination: Optional[bool] = False


class LocationCreate(LocationBase):
    tracker_id: int


class Location(LocationBase):
    id: int
    tracker_id: int
    uploaded_at: Optional[datetime] = None  # CHANGED: Made optional
    screenshots: List[Screenshot] = []

    class Config:
        from_attributes = True


# OCR-specific schema
class SaveLocationFromOCR(BaseModel):
    investigation_id: int
    tracker_name: str
    platform: str
    address: str
    last_seen_text: Optional[str] = None
    screenshot_timestamp: Optional[datetime] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    screenshot_path: Optional[str] = None
    ocr_raw_text: Optional[str] = None
