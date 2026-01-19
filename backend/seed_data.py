#!/usr/bin/env python3
"""
Seed script to create initial test data.
"""
from app.database import SessionLocal
from app.models import User

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

if __name__ == "__main__":
    print("Creating test data...")
    create_test_user()
    print("Done!")
