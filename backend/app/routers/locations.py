from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Location, Tracker, Investigation
from app import schemas

router = APIRouter(prefix="/api/locations", tags=["locations"])

@router.post("/from-ocr", response_model=schemas.Location)
def save_location_from_ocr(
    data: schemas.SaveLocationFromOCR,
    db: Session = Depends(get_db)
):
    """
    Save location data from OCR after user review/correction.
    This is the key endpoint that connects OCR → Database.
    
    Workflow:
    1. User uploads screenshot → OCR extracts data
    2. User reviews/corrects tracker name, address, etc.
    3. User submits this endpoint to save to database
    4. We create/find tracker, then create location
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
            tracker_type="atuvos"  # Default for now
        )
        db.add(tracker)
        db.flush()  # Get the ID without committing yet
    
    # Create location
    location = Location(
        tracker_id=tracker.id,
        address=data.address,
        city=data.city,
        state=data.state,
        postal_code=data.postal_code,
        screenshot_timestamp=data.screenshot_timestamp,
        last_seen_text=data.last_seen_text,
        notes=data.notes,
        uploaded_by=1  # Hardcoded for now (will use auth later)
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
