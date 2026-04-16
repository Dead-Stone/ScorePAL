"""
Script to create test users for all roles (student, teacher, admin, grader)
Usage: python backend/scripts/create_test_users.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.user import UserCreate, UserRole
from auth.auth_config import user_manager

async def create_test_users():
    """Create test users for all roles"""
    
    test_users = [
        {
            "email": "student@test.com",
            "password": "Student123!",
            "first_name": "Test",
            "last_name": "Student",
            "role": UserRole.STUDENT,
            "department": "Computer Science"
        },
        {
            "email": "teacher@test.com",
            "password": "Teacher123!",
            "first_name": "Test",
            "last_name": "Teacher",
            "role": UserRole.TEACHER,
            "department": "Computer Science"
        },
        {
            "email": "admin@test.com",
            "password": "Admin123!",
            "first_name": "Test",
            "last_name": "Admin",
            "role": UserRole.ADMIN,
            "department": "Administration"
        },
        {
            "email": "grader@test.com",
            "password": "Grader123!",
            "first_name": "Test",
            "last_name": "Grader",
            "role": UserRole.GRADER,
            "department": "Computer Science"
        }
    ]
    
    print("Creating test user accounts...\n")
    
    created_users = []
    existing_users = []
    
    for user_data in test_users:
        try:
            user_create = UserCreate(**user_data)
            user = await user_manager.create_user(user_create)
            created_users.append(user)
            print(f"[OK] Created {user.role.value}: {user.email}")
        except Exception as e:
            if "already exists" in str(e):
                existing_users.append(user_data)
                print(f"[EXISTS] {user_data['role'].value} already exists: {user_data['email']}")
            else:
                print(f"[ERROR] Error creating {user_data['role'].value}: {e}")
    
    print("\n" + "="*60)
    print("TEST USER CREDENTIALS")
    print("="*60)
    
    all_users = created_users + existing_users
    for user_data in test_users:
        role = user_data['role'].value
        email = user_data['email']
        password = user_data['password']
        print(f"\n{role.upper()}:")
        print(f"  Email: {email}")
        print(f"  Password: {password}")
        print(f"  Login URL: http://localhost:3000/auth/login")
        if role == "student":
            print(f"  Dashboard: http://localhost:3000/student")
        elif role == "teacher":
            print(f"  Dashboard: http://localhost:3000/dashboard")
        elif role == "admin":
            print(f"  Dashboard: http://localhost:3000/dashboard")
        elif role == "grader":
            print(f"  Dashboard: http://localhost:3000/dashboard")
    
    print("\n" + "="*60)
    print(f"Created: {len(created_users)} new users")
    print(f"Already existed: {len(existing_users)} users")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(create_test_users())

