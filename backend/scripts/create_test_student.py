"""
Script to create a test student account for development/testing
Usage: python backend/scripts/create_test_student.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.user import UserCreate, UserRole
from auth.auth_config import user_manager

async def create_test_student():
    """Create a test student account"""
    
    # Test student credentials
    test_student = UserCreate(
        email="student@test.com",
        password="Student123!",
        first_name="Test",
        last_name="Student",
        role=UserRole.STUDENT,
        institution=None,  # Optional
        department="Computer Science"  # Optional
    )
    
    try:
        print("Creating test student account...")
        user = await user_manager.create_user(test_student)
        print(f"\n✅ Test student account created successfully!")
        print(f"\nLogin Credentials:")
        print(f"  Email: {user.email}")
        print(f"  Password: Student123!")
        print(f"  Role: {user.role.value}")
        print(f"  User ID: {user.id}")
        print(f"\nYou can now login at: http://localhost:3000/auth/login")
        print(f"After login, you'll be redirected to: http://localhost:3000/student")
        
    except Exception as e:
        if "already exists" in str(e):
            print(f"\n⚠️  Student account with email '{test_student.email}' already exists!")
            print(f"\nYou can login with:")
            print(f"  Email: {test_student.email}")
            print(f"  Password: Student123!")
        else:
            print(f"\n❌ Error creating student account: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(create_test_student())

