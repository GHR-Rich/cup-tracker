from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime

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
    List all investigations user has access to.
    Admins see all. Contributors see only investigations they're assigned to.
    """
    if current_user.role == "admin":
        investigations = db.query(models.Investigation).order_by(
            models.Investigation.created_at.desc()
        ).all()
    else:
        # Contributors: only investigations they're explicitly assigned to
        investigations = db.query(models.Investigation).join(
            models.InvestigationUser,
            models.Investigation.id == models.InvestigationUser.investigation_id
        ).filter(
            models.InvestigationUser.user_id == current_user.id
        ).order_by(
            models.Investigation.created_at.desc()
        ).all()
    
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
    
    # Contributors can only see investigations they're assigned to
    if current_user.role != "admin":
        is_assigned = db.query(models.InvestigationUser).filter(
            models.InvestigationUser.investigation_id == investigation_id,
            models.InvestigationUser.user_id == current_user.id
        ).first()
        
        if not is_assigned:
            raise HTTPException(status_code=403, detail="Access denied to this investigation")
    
    return investigation


@router.post("", response_model=schemas.Investigation)
def create_investigation(
    investigation: schemas.InvestigationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Create a new investigation.
    Only admins can create investigations.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create investigations")
    
    # Create investigation
    db_investigation = models.Investigation(
        name=investigation.name,
        brand=investigation.brand,
        description=investigation.description,
        created_by=current_user.id,
        start_date=datetime.utcnow(),
        status=investigation.status or 'active'
    )
    
    db.add(db_investigation)
    db.commit()
    db.refresh(db_investigation)
    
    return db_investigation


@router.post("/{investigation_id}/users", response_model=schemas.InvestigationUser)
def assign_user_to_investigation(
    investigation_id: int,
    assignment: schemas.InvestigationUserAssign,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Assign a user to an investigation.
    Only admins can assign users.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can assign users")
    
    # Check investigation exists
    investigation = db.query(models.Investigation).filter(
        models.Investigation.id == investigation_id
    ).first()
    
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    
    # Check user exists
    user = db.query(models.User).filter(
        models.User.id == assignment.user_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already assigned
    existing = db.query(models.InvestigationUser).filter(
        models.InvestigationUser.investigation_id == investigation_id,
        models.InvestigationUser.user_id == assignment.user_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User already assigned to this investigation")
    
    # Create assignment
    db_assignment = models.InvestigationUser(
        investigation_id=investigation_id,
        user_id=assignment.user_id,
        assigned_by=current_user.id
    )
    
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    
    return db_assignment


@router.get("/{investigation_id}/users", response_model=List[schemas.User])
def list_investigation_users(
    investigation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List all users assigned to an investigation.
    Only admins can view this.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view investigation users")
    
    # Check investigation exists
    investigation = db.query(models.Investigation).filter(
        models.Investigation.id == investigation_id
    ).first()
    
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    
    # Get users
    users = db.query(models.User).join(
        models.InvestigationUser,
        models.User.id == models.InvestigationUser.user_id
    ).filter(
        models.InvestigationUser.investigation_id == investigation_id
    ).all()
    
    return users
