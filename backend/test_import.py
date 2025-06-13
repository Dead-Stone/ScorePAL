#!/usr/bin/env python3
"""
Test script to check if image extraction service can be imported properly.
"""

import sys
import os

print("Testing imports for image extraction system...")
print(f"Python path: {sys.path}")
print(f"Current directory: {os.getcwd()}")

try:
    print("\n1. Testing image_extraction_service import...")
    from image_extraction_service import ImageExtractionService
    print("✅ image_extraction_service imported successfully")
    
    print("\n2. Testing service initialization...")
    service = ImageExtractionService()
    print("✅ ImageExtractionService initialized successfully")
    print(f"   Gemini configured: {service.model is not None}")
    
except Exception as e:
    print(f"❌ Error importing image_extraction_service: {e}")
    import traceback
    traceback.print_exc()

try:
    print("\n3. Testing api.image_extraction import...")
    from api.image_extraction import router
    print("✅ api.image_extraction router imported successfully")
    print(f"   Router prefix: {router.prefix}")
    print(f"   Router tags: {router.tags}")
    
except Exception as e:
    print(f"❌ Error importing api.image_extraction: {e}")
    import traceback
    traceback.print_exc()

try:
    print("\n4. Testing config import...")
    from config import get_settings
    settings = get_settings()
    print("✅ Config imported successfully")
    print(f"   Gemini API key configured: {'GEMINI_API_KEY' in os.environ}")
    
except Exception as e:
    print(f"❌ Error importing config: {e}")
    import traceback
    traceback.print_exc()

print("\n5. Testing required dependencies...")
dependencies = [
    ('fitz', 'PyMuPDF'),
    ('google.generativeai', 'google-generativeai'),
    ('cv2', 'opencv-python'),
    ('docx', 'python-docx'),
    ('PIL', 'pillow')
]

for module, package in dependencies:
    try:
        __import__(module)
        print(f"✅ {package} available")
    except ImportError as e:
        print(f"❌ {package} not available: {e}")

print("\nImport test complete!") 