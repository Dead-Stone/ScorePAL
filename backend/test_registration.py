#!/usr/bin/env python3
"""
Test registration endpoint for ScorePAL
"""

import requests
import json

def test_registration():
    """Test the registration endpoint"""
    
    # Test data
    test_user = {
        "email": "test@example.com",
        "password": "TestPassword123",
        "first_name": "Test",
        "last_name": "User",
        "role": "teacher",
        "institution": "Test University",
        "department": "Computer Science"
    }
    
    try:
        # Make registration request
        print("🧪 Testing registration endpoint...")
        print(f"📧 Email: {test_user['email']}")
        print(f"👤 Name: {test_user['first_name']} {test_user['last_name']}")
        print(f"🎓 Role: {test_user['role']}")
        
        response = requests.post(
            'http://localhost:8000/auth/register/register',
            json=test_user,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"\n📡 Response Status: {response.status_code}")
        print(f"📄 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 201:
            print("✅ Registration successful!")
            user_data = response.json()
            print(f"🆔 User ID: {user_data.get('id')}")
            print(f"📧 Email: {user_data.get('email')}")
            print(f"🎭 Role: {user_data.get('role')}")
            print(f"✅ Active: {user_data.get('is_active')}")
            print(f"🔐 Verified: {user_data.get('is_verified')}")
        else:
            print("❌ Registration failed!")
            print(f"Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the backend is running on localhost:8000")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_login():
    """Test the login endpoint"""
    
    try:
        print("\n🔐 Testing login endpoint...")
        
        # Login data (form-encoded for FastAPI Users)
        login_data = {
            'username': 'test@example.com',
            'password': 'TestPassword123'
        }
        
        response = requests.post(
            'http://localhost:8000/auth/jwt/login',
            data=login_data,  # Form data, not JSON
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        
        print(f"📡 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Login successful!")
            token_data = response.json()
            print(f"🎫 Access Token: {token_data.get('access_token')[:50]}...")
            print(f"🔑 Token Type: {token_data.get('token_type')}")
            
            # Test authenticated endpoint
            headers = {'Authorization': f"Bearer {token_data.get('access_token')}"}
            me_response = requests.get('http://localhost:8000/auth/me', headers=headers)
            
            if me_response.status_code == 200:
                print("✅ Authenticated request successful!")
                user_info = me_response.json()
                print(f"👤 User: {user_info.get('first_name')} {user_info.get('last_name')}")
                print(f"📧 Email: {user_info.get('email')}")
                print(f"🎭 Role: {user_info.get('role')}")
            else:
                print("❌ Authenticated request failed!")
                print(f"Error: {me_response.text}")
                
        else:
            print("❌ Login failed!")
            print(f"Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the backend is running on localhost:8000")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    print("🚀 ScorePAL Registration & Login Test")
    print("=" * 50)
    
    test_registration()
    test_login()
    
    print("\n" + "=" * 50)
    print("💡 To check the database after this test, run: python check_db.py") 