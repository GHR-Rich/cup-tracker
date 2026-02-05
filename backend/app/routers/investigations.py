from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/api/investigations", tags=["investigations"])


@router.get("", response_model=List[schemas.Investigation])
def list_investigations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List all investigations.
    Admins see all. Contributors see only investigations they've contributed to.
    """
    if current_user.role == "admin":
        investigations = db.query(models.Investigation).order_by(
            models.Investigation.name
        ).all()
    else:
        # Contributors: only investigations where they've uploaded locations
        investigations = db.query(models.Investigation).join(
            models.Tracker, models.Investigation.id == models.Tracker.investigation_id
        ).join(
            models.Location, models.Tracker.id == models.Location.tracker_id
        ).filter(
            models.Location.uploaded_by == current_user.id
        ).distinct().all()
    
    return investigations


@router.get("/{investigation_id}", response_model=schemas.Investigation)
def get_investigation(
    investigation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get a single investigation by ID.
    """
    investigation = db.query(models.Investigation).filter(
        models.Investigation.id == investigation_id
    ).first()
    
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    
    # Contributors can only see investigations they've contributed to
    if current_user.role != "admin":
        has_contributions = db.query(models.Location).join(
            models.Tracker, models.Location.tracker_id == models.Tracker.id
        ).filter(
            models.Tracker.investigation_id == investigation_id,
            models.Location.uploaded_by == current_user.id
        ).first()
        
        if not has_contributions:
            raise HTTPException(status_code=404, detail="Investigation not found")
    
    return investigation