"""Seed initial users for cup tracker application."""
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash


def seed_users():
    """Create initial users for testing."""
    db = SessionLocal()

    try:
        # Check if users already exist
        existing_users = db.query(User).count()
        if existing_users > 0:
            print(f"Users already exist in database ({existing_users} users found). Skipping seed.")
            return

        users = [
            {
                "email": "rich@example.com",
                "password": "password123",  # Change this in production!
                "full_name": "Rich Nigro",
                "role": "admin"
            },
            {
                "email": "susan@example.com",
                "password": "password123",  # Change this in production!
                "full_name": "Susan",
                "role": "admin"
            },
            {
                "email": "contributor@example.com",
                "password": "password123",  # Change this in production!
                "full_name": "Test Contributor",
                "role": "contributor"
            }
        ]

        for user_data in users:
            user = User(
                email=user_data["email"],
                password_hash=get_password_hash(user_data["password"]),
                full_name=user_data["full_name"],
                role=user_data["role"]
            )
            db.add(user)
            print(f"✓ Created user: {user_data['email']} ({user_data['role']})")

        db.commit()
        print("\n✅ Successfully seeded users!")
        print("\nLogin credentials:")
        print("  Admin (Rich): rich@example.com / password123")
        print("  Admin (Susan): susan@example.com / password123")
        print("  Contributor: contributor@example.com / password123")
        print("\n⚠️  Remember to change these passwords in production!")

    except Exception as e:
        print(f"❌ Error seeding users: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
