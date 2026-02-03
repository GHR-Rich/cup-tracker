#!/usr/bin/env python3
"""
Seed script to create initial test data.
"""
from app.database import SessionLocal
from app.models import User, Investigation
from datetime import datetime

def create_test_user():
    """Create a test user for development."""
    db = SessionLocal()
    
    try:
        # Check if user already exists
        existing = db.query(User).filter(User.email == "test@cuptracker.com").first()
        if existing:
            print(f"✓ Test user already exists (id={existing.id})")
            return existing
        
        # Create test user with placeholder password
        # (We'll implement proper auth later)
        test_user = User(
            email="test@cuptracker.com",
            password_hash="placeholder_hash",  # Simple placeholder for now
            full_name="Test User",
            role="admin"
        )
        
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        
        print(f"✓ Created test user (id={test_user.id}, email={test_user.email})")
        return test_user
        
    finally:
        db.close()

      def create_default_investigation():
    """Create default investigation with ID 4 for initial setup."""
    db = SessionLocal()
    
    try:
        # Check if investigation ID 4 already exists
        existing = db.query(Investigation).filter(Investigation.id == 4).first()
        if existing:
            print(f"✓ Investigation ID 4 already exists (name={existing.name}, brand={existing.brand})")
            return existing
        
        # Get or create admin user to assign as creator
        admin_user = db.query(User).filter(User.role == "admin").first()
        if not admin_user:
            print("⚠ No admin user found, creating test user first...")
            admin_user = create_test_user()
        
        # Create default investigation with explicit ID 4
        investigation = Investigation(
            id=4,
            name="Default Campaign",
            brand="Starbucks",
            description="Default investigation for cup tracking. Contributors can upload screenshots to this campaign.",
            created_by=admin_user.id,
            created_at=datetime.utcnow(),
            status="active",
            start_date=datetime.utcnow()
        )
        
        db.add(investigation)
        db.commit()
        db.refresh(investigation)
        
        print(f"✓ Created default investigation (id={investigation.id}, name={investigation.name}, brand={investigation.brand})")
        return investigation
        
    finally:
        db.close()
  
if __name__ == "__main__":
    print("Creating test data...")
    create_test_user()
    create_default_investigation()
    print("Done!")
