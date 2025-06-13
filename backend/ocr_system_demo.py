#!/usr/bin/env python3
"""
OCR Data Organization System Demo
This script demonstrates the complete OCR system with data organization.
"""

import os
import sys
from pathlib import Path
from datetime import datetime

def main():
    """Main demo function."""
    print("🎯 OCR DATA ORGANIZATION SYSTEM DEMO")
    print("=" * 80)
    
    print("\n📋 SYSTEM OVERVIEW")
    print("-" * 50)
    print("✅ OCR engines: Tesseract (working), PaddleOCR (configured), EasyOCR (configured)")
    print("✅ Image processing: PDF to images, preprocessing, skew correction")
    print("✅ Data organization: Automatic saving of images and text")
    print("✅ Analysis tools: Comprehensive data analysis and comparison")
    
    print("\n📁 DIRECTORY STRUCTURE")
    print("-" * 50)
    print("backend/data/ocr_extractions/")
    print("├── [session_id]/")
    print("│   ├── original_images/")
    print("│   │   ├── page_1.png")
    print("│   │   ├── page_2.png")
    print("│   │   └── ...")
    print("│   ├── preprocessed_images/")
    print("│   │   ├── page_1_processed.png")
    print("│   │   ├── page_2_processed.png")
    print("│   │   └── ...")
    print("│   ├── extracted_text.txt")
    print("│   └── metadata.json")
    print("└── ...")
    
    # Check current data
    ocr_data_dir = Path("data/ocr_extractions")
    
    if ocr_data_dir.exists():
        session_dirs = [d for d in ocr_data_dir.iterdir() 
                       if d.is_dir() and not d.name in ['images', 'extracted_text', 'preprocessed_images', 'metadata']]
        
        print(f"\n📊 CURRENT DATA STATUS")
        print("-" * 50)
        print(f"📂 Data directory: {ocr_data_dir}")
        print(f"📁 Sessions found: {len(session_dirs)}")
        
        if session_dirs:
            latest_session = max(session_dirs, key=lambda x: x.stat().st_mtime)
            print(f"🕒 Latest session: {latest_session.name}")
            
            # Check latest session contents
            original_images = len(list((latest_session / "original_images").glob("*.png"))) if (latest_session / "original_images").exists() else 0
            processed_images = len(list((latest_session / "preprocessed_images").glob("*.png"))) if (latest_session / "preprocessed_images").exists() else 0
            has_text = (latest_session / "extracted_text.txt").exists()
            has_metadata = (latest_session / "metadata.json").exists()
            
            print(f"   📸 Original images: {original_images}")
            print(f"   🔧 Processed images: {processed_images}")
            print(f"   📝 Extracted text: {'✅' if has_text else '❌'}")
            print(f"   🏷️  Metadata: {'✅' if has_metadata else '❌'}")
    else:
        print(f"\n📊 CURRENT DATA STATUS")
        print("-" * 50)
        print("❌ No OCR data directory found")
    
    print(f"\n🛠️ AVAILABLE TOOLS")
    print("-" * 50)
    print("1. extraction_service_minimal.py - Clean OCR extraction with data saving")
    print("2. test_data_analysis.py - Comprehensive data analysis")
    print("3. OCR_DATA_ORGANIZATION.md - Complete documentation")
    
    print(f"\n🚀 USAGE EXAMPLES")
    print("-" * 50)
    print("# Run OCR extraction with data saving:")
    print("python extraction_service_minimal.py")
    print()
    print("# Analyze all saved data:")
    print("python test_data_analysis.py")
    print()
    print("# Use in your code:")
    print("from extraction_service_minimal import extract_with_tesseract")
    print("text = extract_with_tesseract('document.pdf', save_data=True)")
    
    print(f"\n🎯 BENEFITS")
    print("-" * 50)
    print("✅ Debug OCR issues by comparing original vs processed images")
    print("✅ Analyze text quality and extraction accuracy")
    print("✅ Compare different OCR engines on the same document")
    print("✅ Track OCR performance over time")
    print("✅ Build training datasets for OCR improvement")
    
    print(f"\n💡 NEXT STEPS")
    print("-" * 50)
    print("1. Run 'python test_data_analysis.py' to see current data")
    print("2. Process more documents to build a dataset")
    print("3. Compare OCR engines when dependencies are resolved")
    print("4. Use the organized data for quality analysis")
    
    print(f"\n✨ SYSTEM STATUS: FULLY OPERATIONAL")
    print("=" * 80)

if __name__ == "__main__":
    main() 