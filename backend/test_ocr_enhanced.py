#!/usr/bin/env python3
"""
Enhanced OCR test script to thoroughly check extraction and data organization.
This script will test all aspects of the OCR system and display comprehensive results.
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_file_exists():
    """Check if test files exist."""
    test_file = "test_files/huynhroger_4489590_79107742_CMPE-148_ Networking Homework .pdf"
    
    print("🔍 File Existence Check")
    print("=" * 50)
    
    if os.path.exists(test_file):
        file_size = os.path.getsize(test_file)
        print(f"✅ Test file exists: {test_file}")
        print(f"📏 File size: {file_size:,} bytes ({file_size/1024:.1f} KB)")
        return test_file
    else:
        print(f"❌ Test file not found: {test_file}")
        return None

def test_pdf_to_images():
    """Test PDF to image conversion."""
    test_file = "test_files/huynhroger_4489590_79107742_CMPE-148_ Networking Homework .pdf"
    
    if not os.path.exists(test_file):
        print("❌ Test file not found for image conversion test")
        return []
    
    print("\n🖼️ PDF to Images Conversion Test")
    print("=" * 50)
    
    try:
        # Import the conversion function
        from extraction_service_v2 import convert_pdf_to_images
        
        print("📄 Converting PDF to images...")
        images = convert_pdf_to_images(test_file, dpi=200)  # Lower DPI for faster testing
        
        if images:
            print(f"✅ Successfully converted PDF to {len(images)} images")
            for i, img in enumerate(images):
                print(f"   📸 Page {i+1}: {img.shape} (H×W×C)")
            return images
        else:
            print("❌ Failed to convert PDF to images")
            return []
            
    except Exception as e:
        print(f"❌ Error during PDF conversion: {e}")
        return []

def test_image_preprocessing(images):
    """Test image preprocessing."""
    if not images:
        print("❌ No images available for preprocessing test")
        return []
    
    print("\n🔧 Image Preprocessing Test")
    print("=" * 50)
    
    try:
        from extraction_service_v2 import preprocess_image
        
        preprocessed = []
        for i, img in enumerate(images[:2]):  # Test first 2 pages only
            print(f"🔄 Processing page {i+1}...")
            processed = preprocess_image(img)
            preprocessed.append(processed)
            print(f"   ✅ Original: {img.shape} → Processed: {processed.shape}")
        
        return preprocessed
        
    except Exception as e:
        print(f"❌ Error during preprocessing: {e}")
        return []

def test_ocr_engines():
    """Test all available OCR engines."""
    test_file = "test_files/huynhroger_4489590_79107742_CMPE-148_ Networking Homework .pdf"
    
    if not os.path.exists(test_file):
        print("❌ Test file not found for OCR test")
        return {}
    
    print("\n🤖 OCR Engines Test")
    print("=" * 50)
    
    results = {}
    
    # Test Tesseract
    try:
        from extraction_service_v2 import extract_with_tesseract, tesseract_available
        
        if tesseract_available:
            print("🔍 Testing Tesseract OCR...")
            start_time = datetime.now()
            text = extract_with_tesseract(test_file, save_data=True)
            end_time = datetime.now()
            
            if text:
                results['tesseract'] = {
                    'success': True,
                    'text_length': len(text),
                    'processing_time': (end_time - start_time).total_seconds(),
                    'sample_text': text[:200] + "..." if len(text) > 200 else text
                }
                print(f"   ✅ Success: {len(text)} characters extracted in {results['tesseract']['processing_time']:.1f}s")
            else:
                results['tesseract'] = {'success': False, 'error': 'No text extracted'}
                print("   ❌ Failed: No text extracted")
        else:
            results['tesseract'] = {'success': False, 'error': 'Not available'}
            print("   ❌ Tesseract not available")
            
    except Exception as e:
        results['tesseract'] = {'success': False, 'error': str(e)}
        print(f"   ❌ Error: {e}")
    
    return results

def analyze_saved_data():
    """Analyze the saved OCR data."""
    print("\n📁 Saved Data Analysis")
    print("=" * 50)
    
    try:
        from extraction_service_v2 import OCR_DATA_DIR
        
        if not OCR_DATA_DIR.exists():
            print("❌ OCR data directory not found")
            return
        
        print(f"📂 Data directory: {OCR_DATA_DIR}")
        
        # List all session directories
        session_dirs = [d for d in OCR_DATA_DIR.iterdir() if d.is_dir() and not d.name in ['images', 'extracted_text', 'preprocessed_images', 'metadata']]
        session_dirs.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        
        print(f"📊 Found {len(session_dirs)} extraction sessions")
        
        for i, session_dir in enumerate(session_dirs[:3]):  # Analyze top 3 recent sessions
            print(f"\n📁 Session {i+1}: {session_dir.name}")
            
            # Check metadata
            metadata_file = session_dir / "metadata.json"
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                print(f"   🏷️  Engine: {metadata.get('ocr_engine', 'unknown')}")
                print(f"   📄 Pages: {metadata.get('num_pages', 'unknown')}")
                print(f"   📝 Text length: {metadata.get('text_length', 'unknown')} characters")
                print(f"   ⏰ Timestamp: {metadata.get('timestamp', 'unknown')}")
            
            # Check images
            original_dir = session_dir / "original_images"
            processed_dir = session_dir / "preprocessed_images"
            
            if original_dir.exists():
                original_count = len(list(original_dir.glob("*.png")))
                total_size = sum(f.stat().st_size for f in original_dir.glob("*.png"))
                print(f"   🖼️  Original images: {original_count} files ({total_size/1024/1024:.1f} MB)")
            
            if processed_dir.exists():
                processed_count = len(list(processed_dir.glob("*.png")))
                total_size = sum(f.stat().st_size for f in processed_dir.glob("*.png"))
                print(f"   🔧 Processed images: {processed_count} files ({total_size/1024:.1f} KB)")
            
            # Check extracted text
            text_file = session_dir / "extracted_text.txt"
            if text_file.exists():
                with open(text_file, 'r', encoding='utf-8') as f:
                    text_content = f.read()
                print(f"   📝 Extracted text: {len(text_content)} characters")
                
                # Show first few lines
                lines = text_content.split('\n')[:3]
                for j, line in enumerate(lines):
                    if line.strip():
                        print(f"      Line {j+1}: {line.strip()[:60]}...")
                        break
        
    except Exception as e:
        print(f"❌ Error analyzing saved data: {e}")

def main():
    """Main test function."""
    print("🧪 Enhanced OCR Data Extraction Test")
    print("=" * 60)
    
    # Test 1: File existence
    test_file = test_file_exists()
    if not test_file:
        return
    
    # Test 2: PDF to images conversion
    images = test_pdf_to_images()
    
    # Test 3: Image preprocessing
    preprocessed = test_image_preprocessing(images)
    
    # Test 4: OCR engines
    ocr_results = test_ocr_engines()
    
    # Test 5: Analyze saved data
    analyze_saved_data()
    
    print("\n🎯 Test Summary")
    print("=" * 50)
    print(f"📄 PDF conversion: {'✅' if images else '❌'}")
    print(f"🔧 Preprocessing: {'✅' if preprocessed else '❌'}")
    
    successful_ocr = sum(1 for r in ocr_results.values() if r.get('success', False))
    print(f"🤖 OCR engines: {successful_ocr}/{len(ocr_results)} successful")
    
    if successful_ocr > 0:
        print("✅ OCR data organization system is working!")
    else:
        print("❌ OCR system needs attention")

if __name__ == "__main__":
    main() 