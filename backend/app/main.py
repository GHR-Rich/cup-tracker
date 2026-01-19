from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db, engine
from app.models import User, Investigation, Tracker, Location
from app.config import get_settings
from app.routers import upload


settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="API for tracking plastic cups through their lifecycle",
    version="0.1.0"
)

# Include routers
app.include_router(upload.router)

@app.get("/")
def read_root():
    """Health check endpoint."""
    return {
        "message": "Cup Tracker API is running!",
        "version": "0.1.0",
        "status": "healthy"
    }

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """
    Health check that verifies database connection.
    """
    try:
        # Try a simple query to verify DB connection
        db.execute("SELECT 1")
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/investigations")
def list_investigations(db: Session = Depends(get_db)):
    """
    Get all investigations.
    This endpoint will return an empty list for now since we haven't created any data yet.
    """
    investigations = db.query(Investigation).all()
    return {
        "count": len(investigations),
        "investigations": investigations
    }

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    """
    Get database statistics.
    Shows counts for all main tables.
    """
    return {
        "users": db.query(User).count(),
        "investigations": db.query(Investigation).count(),
        "trackers": db.query(Tracker).count(),
        "locations": db.query(Location).count()
    }
