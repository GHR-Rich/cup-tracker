from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# ============================================================================
# User Schemas
# ============================================================================

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "contributor"  # admin, contributor, viewer

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True  # Allows SQLAlchemy models to work with Pydantic


# ============================================================================
# Investigation Schemas
# ============================================================================

class InvestigationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    brand: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: str = "active"  # active, completed, archived
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class InvestigationCreate(InvestigationBase):
    pass

class InvestigationUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class Investigation(InvestigationBase):
    id: int
    created_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Tracker Schemas
# ============================================================================

class TrackerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    emoji: Optional[str] = None
    tracker_type: str = "atuvos"  # atuvos, airtag, etc.
    platform: str  # apple or google
    notes: Optional[str] = None

class TrackerCreate(TrackerBase):
    investigation_id: int

class TrackerUpdate(BaseModel):
    name: Optional[str] = None
    emoji: Optional[str] = None
    tracker_type: Optional[str] = None
    platform: Optional[str] = None
    notes: Optional[str] = None

class Tracker(TrackerBase):
    id: int
    investigation_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Location Schemas
# ============================================================================

class LocationBase(BaseModel):
    address: str
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    location_type: Optional[str] = None  # starting_point, mrf, landfill, etc.
    location_type_confidence: Optional[str] = None  # auto, manual, verified
    screenshot_timestamp: Optional[datetime] = None
    last_seen_text: Optional[str] = None
    battery_level: Optional[int] = None
    is_final_destination: bool = False
    notes: Optional[str] = None

class LocationCreate(LocationBase):
    tracker_id: int
    uploaded_by: Optional[int] = None

class Location(LocationBase):
    id: int
    tracker_id: int
    uploaded_by: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# OCR Result Schemas
# ============================================================================

class OCRResult(BaseModel):
    """Schema for OCR extraction results."""
    platform: str  # apple or google
    tracker_name: Optional[str] = None
    address: Optional[str] = None
    last_seen: Optional[str] = None
    confidence: float
    raw_text: str
    error: Optional[str] = None

class UploadResponse(BaseModel):
    """Schema for upload endpoint response."""
    status: str
    filename: str
    uploaded_at: datetime
    file_size: int
    ocr_result: OCRResult
    temp_file_path: str


# ============================================================================
# Combined Schemas (with relationships)
# ============================================================================

class TrackerWithLocations(Tracker):
    """Tracker with its location history."""
    locations: List[Location] = []
    
    class Config:
        from_attributes = True

class InvestigationWithTrackers(Investigation):
    """Investigation with all its trackers."""
    trackers: List[Tracker] = []
    
    class Config:
        from_attributes = True

class InvestigationDetailed(Investigation):
    """Investigation with full nested data."""
    trackers: List[TrackerWithLocations] = []
    
    class Config:
        from_attributes = True


# ============================================================================
# Request Schemas for Saving OCR Data
# ============================================================================

class SaveLocationFromOCR(BaseModel):
    """
    Schema for saving OCR-extracted data after user review.
    User can correct tracker name, address, etc. before saving.
    """
    investigation_id: int
    tracker_name: str  # User-corrected tracker name
    platform: str  # apple or google
    address: str
    last_seen_text: Optional[str] = None
    screenshot_timestamp: Optional[datetime] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    notes: Optional[str] = None
    temp_file_path: Optional[str] = None  # Reference to uploaded file
