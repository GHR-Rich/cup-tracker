from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import trackers, locations, upload, auth, users, investigations
from app.database import engine
from app import models
import os

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Cup Tracker API",
    description="API for tracking plastic cups through their lifecycle",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded screenshots as static files
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(trackers.router)
app.include_router(locations.router)
app.include_router(users.router)
app.include_router(investigations.router)

@app.get("/")
def read_root():
    return {"message": "Cup Tracker API", "status": "running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
