#!/usr/bin/env python3
"""
Test script to verify Gemini API key setup for ScorePAL.
"""

import os
import sys
from dotenv import load_dotenv

def test_gemini_setup():
    """Test Gemini API key configuration and connectivity."""
    print("🔍 Testing Gemini API Key Setup")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    # Check if API key is set
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        print("❌ GEMINI_API_KEY not found in environment variables")
        print("💡 Please set your Gemini API key in the .env file")
        return False
    
    print(f"✅ GEMINI_API_KEY found: {gemini_key[:10]}...{gemini_key[-4:]}")
    
    # Test import
    try:
        import google.generativeai as genai
        print("✅ google.generativeai package imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import google.generativeai: {e}")
        print("💡 Install with: pip install google-generativeai")
        return False
    
    # Test API connection
    try:
        print("🔗 Testing API connection...")
        genai.configure(api_key=gemini_key)
        
        # Try to create a model instance
        model = genai.GenerativeModel('gemini-1.5-flash')
        print("✅ Model instance created successfully")
        
        # Test a simple generation
        print("🧪 Testing content generation...")
        response = model.generate_content("Say 'Hello, ScorePAL setup is working!'")
        
        if response and response.text:
            print(f"✅ API test successful! Response: {response.text.strip()}")
            return True
        else:
            print("❌ API returned empty response")
            return False
            
    except Exception as e:
        print(f"❌ API test failed: {str(e)}")
        
        # Check for common errors
        if "API_KEY_INVALID" in str(e):
            print("💡 Your API key appears to be invalid. Please check:")
            print("   - Get a new key from: https://aistudio.google.com/app/apikey")
            print("   - Make sure you copied the entire key")
        elif "PERMISSION_DENIED" in str(e):
            print("💡 Permission denied. Your API key might not have access to Gemini API")
        elif "QUOTA_EXCEEDED" in str(e):
            print("💡 Quota exceeded. You might have hit the free tier limit")
            print("   - Wait for quota reset or upgrade your plan")
        
        return False

def show_setup_instructions():
    """Show setup instructions."""
    print("\n📝 Setup Instructions:")
    print("=" * 50)
    print("1. Get a Gemini API key:")
    print("   - Visit: https://aistudio.google.com/app/apikey")
    print("   - Sign in with your Google account")
    print("   - Click 'Create API key' → 'Create API key in new project'")
    print("   - Copy the generated key (starts with 'AIza...')")
    print()
    print("2. Create/update .env file in your project root:")
    print("   GEMINI_API_KEY=your_actual_api_key_here")
    print("   BACKEND_URL=https://34-13-75-235.nip.io")
    print("   NEXT_PUBLIC_API_URL=https://34-13-75-235.nip.io")
    print()
    print("3. Restart your application")

if __name__ == "__main__":
    print("🚀 ScorePAL Gemini API Setup Test")
    print("=" * 50)
    
    success = test_gemini_setup()
    
    if success:
        print("\n🎉 SUCCESS! Your Gemini API key is properly configured.")
        print("✅ You can now use ScorePAL's AI grading and rubric generation features.")
    else:
        print("\n❌ SETUP INCOMPLETE")
        show_setup_instructions()
    
    print("\n" + "=" * 50) 