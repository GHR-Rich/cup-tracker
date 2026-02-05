from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app import models
from app.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    role: str

    class Config:
        from_attributes = True


@router.get("", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List all users. Admin-only.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = db.query(models.User).order_by(models.User.full_name).all()
    return users