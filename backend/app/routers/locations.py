from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Location, Tracker, Investigation
from app import schemas
from app.services.geocoder import Geocoder

router = APIRouter(prefix="/api/locations", tags=["locations"])

@router.post("/from-ocr", response_model=schemas.Location)
def save_location_from_ocr(
    data: schemas.SaveLocationFromOCR,
    db: Session = Depends(get_db)
):
    """
    Save location data from OCR after user review/correction.
    Automatically geocodes address to get lat/lng coordinates.
    """
    
    # Verify investigation exists
    investigation = db.query(Investigation).filter(Investigation.id == data.investigation_id).first()
    if not investigation:
        raise HTTPException(status_code=404, detail=f"Investigation {data.investigation_id} not found")
    
    # Find or create tracker
    tracker = db.query(Tracker).filter(
        Tracker.investigation_id == data.investigation_id,
        Tracker.name == data.tracker_name
    ).first()
    
    if not tracker:
        # Create new tracker
        tracker = Tracker(
            investigation_id=data.investigation_id,
            name=data.tracker_name,
            platform=data.platform,
            tracker_type="atuvos"
        )
        db.add(tracker)
        db.flush()
    
    # Geocode address to get coordinates
    geocoder = Geocoder()
    coordinates = geocoder.geocode(data.address)
    
    latitude = None
    longitude = None
    if coordinates:
        latitude, longitude = coordinates
    
    # Create location
    location = Location(
        tracker_id=tracker.id,
        address=data.address,
        latitude=latitude,
        longitude=longitude,
        city=data.city,
        state=data.state,
        postal_code=data.postal_code,
        screenshot_timestamp=data.screenshot_timestamp,
        last_seen_text=data.last_seen_text,
        notes=data.notes,
        uploaded_by=1
    )
    
    db.add(location)
    db.commit()
    db.refresh(location)
    
    return location


@router.get("/{location_id}", response_model=schemas.Location)
def get_location(location_id: int, db: Session = Depends(get_db)):
    """Get a specific location by ID."""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location

@router.get("/tracker/{tracker_id}", response_model=List[schemas.Location])
def list_locations_for_tracker(
    tracker_id: int,
    db: Session = Depends(get_db),
    limit: Optional[int] = 100
):
    """
    Get all locations for a specific tracker, ordered by timestamp.
    """
    locations = db.query(Location).filter(
        Location.tracker_id == tracker_id
    ).order_by(
        Location.screenshot_timestamp.desc()
    ).limit(limit).all()
    
    return locations

@router.post("/geocode/{location_id}", response_model=schemas.Location)
def geocode_existing_location(location_id: int, db: Session = Depends(get_db)):
    """
    Geocode an existing location that doesn't have coordinates yet.
    Useful for backfilling old data.
    """
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    if location.latitude and location.longitude:
        return location  # Already has coordinates
    
    # Geocode the address
    geocoder = Geocoder()
    coordinates = geocoder.geocode(location.address)
    
    if coordinates:
        latitude, longitude = coordinates
        location.latitude = latitude
        location.longitude = longitude
        db.commit()
        db.refresh(location)
    
    return location
