#!/usr/bin/env python3
"""
Simple test script to demonstrate OCR data organization functionality.
This script focuses on Tesseract OCR to avoid dependency conflicts.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_ocr_data_organization():
    """Test the OCR data organization with a sample file."""
    
    # Use the existing test file
    test_file = "test_files/huynhroger_4489590_79107742_CMPE-148_ Networking Homework .pdf"
    
    if not os.path.exists(test_file):
        print(f"Test file not found: {test_file}")
        return
    
    print("🔍 Testing OCR Data Organization")
    print("=" * 50)
    
    # Import only what we need to avoid dependency issues
    try:
        from extraction_service_v2 import extract_with_tesseract, OCR_DATA_DIR
        
        # Test with Tesseract
        print("Testing Tesseract OCR...")
        result = extract_with_tesseract(test_file, save_data=True)
        
        if result:
            print("✅ Tesseract OCR - Data saved successfully")
            print(f"📄 Extracted {len(result)} characters of text")
        else:
            print("❌ Tesseract OCR - Failed")
            
    except Exception as e:
        print(f"❌ Tesseract OCR - Error: {e}")
        return
    
    print("\n📁 OCR Data Directory Structure:")
    print("=" * 50)
    
    # Show the directory structure
    if OCR_DATA_DIR.exists():
        print(f"📂 {OCR_DATA_DIR}")
        
        # List all session directories
        session_dirs = [d for d in OCR_DATA_DIR.iterdir() if d.is_dir()]
        session_dirs.sort(key=lambda x: x.stat().st_mtime, reverse=True)  # Sort by modification time
        
        for session_dir in session_dirs[:3]:  # Show only the 3 most recent sessions
            print(f"  📁 {session_dir.name}")
            
            # Show contents of each session
            for item in session_dir.iterdir():
                if item.is_dir():
                    file_count = len(list(item.glob("*")))
                    print(f"    📁 {item.name}/ ({file_count} files)")
                else:
                    size = item.stat().st_size
                    if size > 1024:
                        size_str = f"{size/1024:.1f}KB"
                    else:
                        size_str = f"{size}B"
                    print(f"    📄 {item.name} ({size_str})")
        
        if len(session_dirs) > 3:
            print(f"  ... and {len(session_dirs) - 3} more sessions")
    else:
        print("❌ OCR data directory not found")
    
    print(f"\n📊 Summary:")
    print(f"  • Total sessions: {len(session_dirs) if 'session_dirs' in locals() else 0}")
    print(f"  • Data location: {OCR_DATA_DIR}")
    
    print("\n💡 How to use the organized data:")
    print("  1. Check original_images/ for the source images")
    print("  2. Check preprocessed_images/ for processed versions")
    print("  3. Check extracted_text.txt for the OCR results")
    print("  4. Check metadata.json for processing information")
    
    # Show a sample of the extracted text
    if 'result' in locals() and result:
        print(f"\n📝 Sample extracted text (first 200 characters):")
        print("-" * 50)
        print(result[:200] + "..." if len(result) > 200 else result)

if __name__ == "__main__":
    test_ocr_data_organization() 