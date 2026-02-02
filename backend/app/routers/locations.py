from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime
from app import models, schemas
from app.database import get_db
from app.services.geocoder import Geocoder
from app.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.post("/from-ocr", response_model=schemas.Location)
def save_location_from_ocr(
    data: schemas.SaveLocationFromOCR,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Save location from OCR data with optional screenshot"""
    
    # Find or create tracker
    tracker = db.query(models.Tracker).filter(
        models.Tracker.investigation_id == data.investigation_id,
        models.Tracker.name == data.tracker_name
    ).first()
    
    if not tracker:
        tracker = models.Tracker(
            investigation_id=data.investigation_id,
            name=data.tracker_name,
            platform=data.platform
        )
        db.add(tracker)
        db.flush()
    
    # Geocode the address
    geocoder = Geocoder()
    geocode_result = geocoder.geocode(data.address)
    
    latitude = None
    longitude = None
    geocoded_city = None
    geocoded_state = None
    geocoded_postal = None
    
    if geocode_result:
        latitude, longitude, geocoded_city, geocoded_state, geocoded_postal = geocode_result
    
    # Create location with explicit uploaded_at
    location = models.Location(
        tracker_id=tracker.id,
        address=data.address,
        latitude=latitude,
        longitude=longitude,
        city=data.city or geocoded_city,
        state=data.state or geocoded_state,
        postal_code=data.postal_code or geocoded_postal,
        last_seen_text=data.last_seen_text,
        screenshot_timestamp=data.screenshot_timestamp,
        uploaded_by=current_user.id,
        uploaded_at=datetime.utcnow()  # ADDED: Explicit timestamp
    )
    db.add(location)
    db.flush()
    
    # Create screenshot record if path provided
    if data.screenshot_path:
        screenshot = models.Screenshot(
            location_id=location.id,
            file_path=data.screenshot_path,
            file_name=data.screenshot_path.split('/')[-1],
            platform=data.platform,
            ocr_raw_text=data.ocr_raw_text,
            uploaded_by=current_user.id,
            uploaded_at=datetime.utcnow()  # ADDED: Explicit timestamp
        )
        db.add(screenshot)
    
    db.commit()
    db.refresh(location)
    
    # Load screenshots relationship for response
    location = db.query(models.Location).options(
        joinedload(models.Location.screenshots)
    ).filter(models.Location.id == location.id).first()
    
    return location


@router.get("/tracker/{tracker_id}", response_model=List[schemas.Location])
def get_locations_by_tracker(
    tracker_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all locations for a specific tracker (filtered by user role)"""
    query = db.query(models.Location).options(
        joinedload(models.Location.screenshots)
    ).filter(models.Location.tracker_id == tracker_id)

    # Contributors only see their own uploads
    if current_user.role == "contributor":
        query = query.filter(models.Location.uploaded_by == current_user.id)

    # Admins see everything (no additional filter)

    locations = query.order_by(models.Location.screenshot_timestamp.desc()).all()
    return locations


@router.get("/{location_id}", response_model=schemas.Location)
def get_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific location by ID (filtered by user role)"""
    query = db.query(models.Location).options(
        joinedload(models.Location.screenshots)
    ).filter(models.Location.id == location_id)

    # Contributors can only see their own uploads
    if current_user.role == "contributor":
        query = query.filter(models.Location.uploaded_by == current_user.id)

    location = query.first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.post("/", response_model=schemas.Location)
def create_location(
    location: schemas.LocationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new location"""
    db_location = models.Location(
        **location.dict(),
        uploaded_by=current_user.id,
        uploaded_at=datetime.utcnow()
    )
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location
