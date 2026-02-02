from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models import Tracker, Investigation
from app import schemas, models
from app.auth import get_current_user

router = APIRouter(prefix="/api/trackers", tags=["trackers"])


class TrackerUpdate(BaseModel):
    """Schema for updating tracker properties"""
    emoji: Optional[str] = None
    name: Optional[str] = None
    notes: Optional[str] = None


@router.post("", response_model=schemas.Tracker)
def create_tracker(
    tracker: schemas.TrackerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Create a new tracker within an investigation.
    """
    # Verify investigation exists
    investigation = db.query(Investigation).filter(Investigation.id == tracker.investigation_id).first()
    if not investigation:
        raise HTTPException(status_code=404, detail=f"Investigation {tracker.investigation_id} not found")
    
    # Check if tracker name already exists in this investigation
    existing = db.query(Tracker).filter(
        Tracker.investigation_id == tracker.investigation_id,
        Tracker.name == tracker.name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Tracker '{tracker.name}' already exists in this investigation"
        )
    
    # Create tracker
    db_tracker = Tracker(**tracker.model_dump())
    db.add(db_tracker)
    db.commit()
    db.refresh(db_tracker)
    return db_tracker


@router.patch("/{tracker_id}", response_model=schemas.Tracker)
def update_tracker(
    tracker_id: int,
    updates: TrackerUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Update tracker properties (emoji, name, notes).
    """
    tracker = db.query(Tracker).filter(Tracker.id == tracker_id).first()
    if not tracker:
        raise HTTPException(status_code=404, detail="Tracker not found")
    
    # Update only provided fields
    if updates.emoji is not None:
        tracker.emoji = updates.emoji
    if updates.name is not None:
        tracker.name = updates.name
    if updates.notes is not None:
        tracker.notes = updates.notes
    
    db.commit()
    db.refresh(tracker)
    return tracker


@router.get("/{tracker_id}", response_model=schemas.Tracker)
def get_tracker(
    tracker_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get a tracker by ID.
    """
    tracker = db.query(Tracker).filter(Tracker.id == tracker_id).first()
    if not tracker:
        raise HTTPException(status_code=404, detail="Tracker not found")
    return tracker


@router.get("/investigation/{investigation_id}", response_model=List[schemas.Tracker])
def list_trackers_for_investigation(
    investigation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get all trackers for a specific investigation.
    """
    trackers = db.query(Tracker).filter(Tracker.investigation_id == investigation_id).all()
    return trackers
