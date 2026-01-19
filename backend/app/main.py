from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db, engine
from app.models import User, Investigation, Tracker, Location
from app.config import get_settings
from app.routers import upload, trackers, locations  # Add trackers and locations
from app import schemas


settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="API for tracking plastic cups through their lifecycle",
    version="0.1.0"
)

# Include routers
app.include_router(upload.router)
app.include_router(trackers.router) 
app.include_router(locations.router)


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

# Replace the old get investigations endpoint with this:
@app.get("/api/investigations", response_model=List[schemas.Investigation])
def list_investigations(db: Session = Depends(get_db)):
    """Get all investigations with proper schema validation."""
    investigations = db.query(Investigation).all()
    return investigations

@app.post("/api/investigations", response_model=schemas.Investigation)
def create_investigation(
    investigation: schemas.InvestigationCreate,
    db: Session = Depends(get_db)
):
    """Create a new investigation."""
    # For now, hardcode created_by to 1 (we'll add auth later)
    db_investigation = Investigation(
        **investigation.model_dump(),
        created_by=1
    )
    db.add(db_investigation)
    db.commit()
    db.refresh(db_investigation)
    return db_investigation

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
