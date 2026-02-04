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
    Contributors can only see trackers they've uploaded locations to.
    """
    tracker = db.query(Tracker).filter(Tracker.id == tracker_id).first()
    if not tracker:
        raise HTTPException(status_code=404, detail="Tracker not found")
    
    # Contributors can only see trackers they've contributed to
    if current_user.role != "admin":
        has_locations = db.query(models.Location).filter(
            models.Location.tracker_id == tracker_id,
            models.Location.uploaded_by == current_user.id
        ).first()
        if not has_locations:
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
    Admins see all trackers. Contributors only see trackers they've uploaded to.
    """
    if current_user.role == "admin":
        trackers = db.query(Tracker).filter(
            Tracker.investigation_id == investigation_id
        ).all()
    else:
        # Contributors: only trackers that have locations uploaded by them
        trackers = db.query(Tracker).join(
            models.Location, Tracker.id == models.Location.tracker_id
        ).filter(
            Tracker.investigation_id == investigation_id,
            models.Location.uploaded_by == current_user.id
        ).distinct().all()
    
    return trackers