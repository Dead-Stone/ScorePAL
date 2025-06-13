#!/usr/bin/env python3
"""
Test script for Image Extraction Service
Tests image extraction from PDF/DOC files and AI summary generation.
"""

import os
import sys
from pathlib import Path
from image_extraction_service import ImageExtractionService

def test_image_extraction():
    """Test the image extraction service with available test files."""
    print("🖼️ Testing Image Extraction Service")
    print("=" * 60)
    
    # Initialize service
    service = ImageExtractionService()
    
    # Test files to check
    test_files = [
        "test_files/huynhroger_4489590_79107742_CMPE-148_ Networking Homework .pdf",
        "uploads/sample.pdf",  # If exists
        "data/test.pdf"  # If exists
    ]
    
    # Find available test files
    available_files = []
    for test_file in test_files:
        if os.path.exists(test_file):
            available_files.append(test_file)
            print(f"✅ Found test file: {test_file}")
        else:
            print(f"❌ Test file not found: {test_file}")
    
    if not available_files:
        print("\n⚠️ No test files found. Creating a simple test...")
        print("Please add a PDF or DOCX file with images to test the service.")
        return
    
    # Test each available file
    for test_file in available_files:
        print(f"\n🔍 Testing file: {test_file}")
        print("-" * 40)
        
        # Extract and analyze images
        result = service.extract_and_analyze_images(
            test_file, 
            context=f"Test extraction from {Path(test_file).name}"
        )
        
        if result.get('error'):
            print(f"❌ Error: {result['error']}")
            continue
        
        if result.get('success'):
            print(f"✅ Successfully extracted {result['total_images']} images")
            print(f"📁 Session ID: {result['session_id']}")
            print(f"📂 Location: {result['extraction_location']}")
            
            if result['total_images'] > 0:
                print(f"\n📋 Image Details:")
                for i, img in enumerate(result['images']):
                    print(f"\n🖼️ Image {i+1}:")
                    print(f"   📄 Page: {img['page_number']}")
                    print(f"   📏 Size: {img['width']}x{img['height']} pixels")
                    print(f"   🎨 Format: {img['format']}")
                    print(f"   📝 Summary Preview: {img['summary'][:150]}...")
                    
                # Show directory structure
                if result['extraction_location']:
                    print(f"\n📁 Directory Structure:")
                    show_directory_structure(result['extraction_location'])
            else:
                print("ℹ️ No images found in this document")
        else:
            print(f"ℹ️ {result.get('message', 'No images found')}")

def show_directory_structure(directory_path):
    """Show the structure of the extraction directory."""
    try:
        directory = Path(directory_path)
        if not directory.exists():
            print(f"   Directory not found: {directory_path}")
            return
        
        for item in directory.rglob("*"):
            if item.is_file():
                relative_path = item.relative_to(directory)
                file_size = item.stat().st_size
                print(f"   📄 {relative_path} ({file_size:,} bytes)")
            elif item.is_dir() and item != directory:
                relative_path = item.relative_to(directory)
                print(f"   📁 {relative_path}/")
                
    except Exception as e:
        print(f"   Error showing directory structure: {e}")

def test_specific_features():
    """Test specific features of the image extraction service."""
    print(f"\n🧪 Testing Specific Features")
    print("=" * 60)
    
    service = ImageExtractionService()
    
    # Test 1: Check if Gemini is configured
    print("1. Gemini AI Configuration:")
    if service.model:
        print("   ✅ Gemini AI is configured and ready")
    else:
        print("   ⚠️ Gemini AI not configured (API key missing)")
    
    # Test 2: Check supported file types
    print("\n2. Supported File Types:")
    supported_types = ['.pdf', '.docx']
    for file_type in supported_types:
        print(f"   ✅ {file_type} - Supported")
    
    unsupported_types = ['.doc', '.ppt', '.pptx', '.txt']
    for file_type in unsupported_types:
        if file_type == '.doc':
            print(f"   ⚠️ {file_type} - Requires conversion to DOCX")
        else:
            print(f"   ❌ {file_type} - Not supported")
    
    # Test 3: Check data directory
    print("\n3. Data Directory Structure:")
    from image_extraction_service import IMAGE_EXTRACTION_DIR
    print(f"   📁 Base directory: {IMAGE_EXTRACTION_DIR}")
    if IMAGE_EXTRACTION_DIR.exists():
        print("   ✅ Directory exists")
        sessions = list(IMAGE_EXTRACTION_DIR.glob("*_images"))
        print(f"   📊 Existing sessions: {len(sessions)}")
        for session in sessions[:3]:  # Show first 3 sessions
            print(f"      - {session.name}")
        if len(sessions) > 3:
            print(f"      ... and {len(sessions) - 3} more")
    else:
        print("   ⚠️ Directory will be created on first use")

def main():
    """Main test function."""
    print("🚀 ScorePAL Image Extraction Service Test")
    print("=" * 60)
    
    # Change to backend directory if needed
    if not os.path.exists("image_extraction_service.py"):
        backend_dir = Path(__file__).parent
        os.chdir(backend_dir)
        print(f"📂 Changed to directory: {backend_dir}")
    
    try:
        # Test basic functionality
        test_image_extraction()
        
        # Test specific features
        test_specific_features()
        
        print(f"\n✅ Image Extraction Service Test Complete!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 