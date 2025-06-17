#!/usr/bin/env python3
"""
Test script to test the image extraction API upload endpoint.
"""

import requests
import os
from pathlib import Path

def test_image_extraction_api():
    """Test the image extraction API endpoint."""
    print("🧪 Testing Image Extraction API")
    print("=" * 50)
    
    # API endpoint
    api_url = "https://34-13-75-235.nip.io/api/image-extraction/extract"
    
    # Test file
    test_file = "test_files/huynhroger_4489590_79107742_CMPE-148_ Networking Homework .pdf"
    
    if not os.path.exists(test_file):
        print(f"❌ Test file not found: {test_file}")
        return
    
    print(f"📄 Testing with file: {Path(test_file).name}")
    
    try:
        # Prepare the file for upload
        with open(test_file, 'rb') as f:
            files = {
                'file': (Path(test_file).name, f, 'application/pdf')
            }
            data = {
                'context': 'API test - CMPE-148 Networking homework for grading'
            }
            
            print("🚀 Uploading file to API...")
            response = requests.post(api_url, files=files, data=data, timeout=120)
        
        print(f"📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Upload successful!")
            print(f"📁 Session ID: {result.get('session_id', 'N/A')}")
            print(f"🖼️ Total Images: {result.get('total_images', 0)}")
            print(f"📂 Location: {result.get('extraction_location', 'N/A')}")
            
            if result.get('images'):
                print(f"\n📋 Image Details:")
                for i, img in enumerate(result['images'][:3]):  # Show first 3
                    print(f"  🖼️ Image {i+1}: {img['width']}x{img['height']} pixels (Page {img['page_number']})")
                    print(f"     📝 Summary: {img['summary'][:100]}...")
                
                if len(result['images']) > 3:
                    print(f"     ... and {len(result['images']) - 3} more images")
        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"Error: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

def test_health_endpoint():
    """Test the health endpoint."""
    print("\n🏥 Testing Health Endpoint")
    print("=" * 50)
    
    try:
        response = requests.get("https://34-13-75-235.nip.io/api/image-extraction/health", timeout=10)
        
        if response.status_code == 200:
            health = response.json()
            print("✅ Health check passed!")
            print(f"📊 Status: {health.get('status', 'unknown')}")
            print(f"🤖 Gemini Configured: {health.get('gemini_configured', False)}")
            print(f"📁 Data Directory: {health.get('data_directory', 'N/A')}")
            print(f"📂 Directory Exists: {health.get('data_directory_exists', False)}")
            print(f"📄 Supported Formats: {health.get('supported_formats', [])}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            print(f"Error: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Health check request failed: {e}")

def test_sessions_endpoint():
    """Test the sessions endpoint."""
    print("\n📁 Testing Sessions Endpoint")
    print("=" * 50)
    
    try:
        response = requests.get("https://34-13-75-235.nip.io/api/image-extraction/sessions", timeout=10)
        
        if response.status_code == 200:
            sessions = response.json()
            print("✅ Sessions retrieved successfully!")
            print(f"📊 Total Sessions: {sessions.get('total', 0)}")
            
            for i, session in enumerate(sessions.get('sessions', [])[:3]):  # Show first 3
                print(f"\n📁 Session {i+1}:")
                print(f"   🆔 ID: {session.get('session_id', 'N/A')}")
                print(f"   📄 File: {Path(session.get('original_file', 'N/A')).name}")
                print(f"   🖼️ Images: {session.get('total_images', 0)}")
                print(f"   📅 Timestamp: {session.get('timestamp', 'N/A')}")
        else:
            print(f"❌ Sessions request failed: {response.status_code}")
            print(f"Error: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Sessions request failed: {e}")

def main():
    """Run all API tests."""
    print("🚀 ScorePAL Image Extraction API Test Suite")
    print("=" * 60)
    
    # Test health endpoint first
    test_health_endpoint()
    
    # Test sessions endpoint
    test_sessions_endpoint()
    
    # Test file upload (commented out to avoid creating duplicate sessions)
    print("\n⚠️ Skipping upload test to avoid duplicate sessions")
    print("   (Uncomment test_image_extraction_api() to test uploads)")
    # test_image_extraction_api()
    
    print(f"\n✅ API Test Suite Complete!")
    print("=" * 60)

if __name__ == "__main__":
    main() 