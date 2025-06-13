#!/usr/bin/env python3
"""
Comprehensive OCR data analysis script.
This script analyzes all the extracted OCR data and displays comprehensive results.
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime
import cv2
import numpy as np

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def analyze_extraction_sessions():
    """Analyze all OCR extraction sessions."""
    print("🔍 OCR Data Analysis")
    print("=" * 60)
    
    # Use the data directory from minimal extraction service
    ocr_data_dir = Path("data/ocr_extractions")
    
    if not ocr_data_dir.exists():
        print("❌ OCR data directory not found")
        return
    
    print(f"📂 Data directory: {ocr_data_dir}")
    
    # List all session directories (exclude the old structure directories)
    session_dirs = [d for d in ocr_data_dir.iterdir() 
                   if d.is_dir() and not d.name in ['images', 'extracted_text', 'preprocessed_images', 'metadata']]
    session_dirs.sort(key=lambda x: x.stat().st_mtime, reverse=True)
    
    print(f"📊 Found {len(session_dirs)} extraction sessions")
    
    if not session_dirs:
        print("❌ No extraction sessions found")
        return
    
    # Analyze each session
    for i, session_dir in enumerate(session_dirs):
        print(f"\n{'='*60}")
        print(f"📁 SESSION {i+1}: {session_dir.name}")
        print(f"{'='*60}")
        
        analyze_session(session_dir)

def analyze_session(session_dir):
    """Analyze a single OCR session."""
    
    # 1. Analyze metadata
    print("\n🏷️ METADATA ANALYSIS")
    print("-" * 40)
    
    metadata_file = session_dir / "metadata.json"
    if metadata_file.exists():
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        
        print(f"📄 Original file: {metadata.get('original_file', 'unknown')}")
        print(f"🤖 OCR engine: {metadata.get('ocr_engine', 'unknown')}")
        print(f"📊 Number of pages: {metadata.get('num_pages', 'unknown')}")
        print(f"📝 Text length: {metadata.get('text_length', 'unknown')} characters")
        print(f"⏰ Timestamp: {metadata.get('timestamp', 'unknown')}")
    else:
        print("❌ Metadata file not found")
        metadata = {}
    
    # 2. Analyze original images
    print("\n🖼️ ORIGINAL IMAGES ANALYSIS")
    print("-" * 40)
    
    original_dir = session_dir / "original_images"
    if original_dir.exists():
        image_files = list(original_dir.glob("*.png"))
        image_files.sort(key=lambda x: int(x.stem.split('_')[1]))  # Sort by page number
        
        total_size = 0
        for img_file in image_files:
            size = img_file.stat().st_size
            total_size += size
            
            # Load and analyze image
            try:
                img = cv2.imread(str(img_file))
                if img is not None:
                    height, width = img.shape[:2]
                    print(f"   📸 {img_file.name}: {width}×{height} pixels, {size/1024:.1f} KB")
                else:
                    print(f"   ❌ {img_file.name}: Could not load image")
            except Exception as e:
                print(f"   ❌ {img_file.name}: Error loading - {e}")
        
        print(f"📊 Total: {len(image_files)} images, {total_size/1024/1024:.1f} MB")
    else:
        print("❌ Original images directory not found")
    
    # 3. Analyze preprocessed images
    print("\n🔧 PREPROCESSED IMAGES ANALYSIS")
    print("-" * 40)
    
    processed_dir = session_dir / "preprocessed_images"
    if processed_dir.exists():
        processed_files = list(processed_dir.glob("*.png"))
        processed_files.sort(key=lambda x: int(x.stem.split('_')[1]))  # Sort by page number
        
        total_size = 0
        for img_file in processed_files:
            size = img_file.stat().st_size
            total_size += size
            
            # Load and analyze processed image
            try:
                img = cv2.imread(str(img_file), cv2.IMREAD_GRAYSCALE)
                if img is not None:
                    height, width = img.shape
                    # Calculate image statistics
                    mean_intensity = np.mean(img)
                    std_intensity = np.std(img)
                    print(f"   🔧 {img_file.name}: {width}×{height} pixels, {size/1024:.1f} KB")
                    print(f"      📊 Mean intensity: {mean_intensity:.1f}, Std: {std_intensity:.1f}")
                else:
                    print(f"   ❌ {img_file.name}: Could not load image")
            except Exception as e:
                print(f"   ❌ {img_file.name}: Error loading - {e}")
        
        print(f"📊 Total: {len(processed_files)} processed images, {total_size/1024:.1f} KB")
    else:
        print("❌ Preprocessed images directory not found")
    
    # 4. Analyze extracted text
    print("\n📝 EXTRACTED TEXT ANALYSIS")
    print("-" * 40)
    
    text_file = session_dir / "extracted_text.txt"
    if text_file.exists():
        with open(text_file, 'r', encoding='utf-8') as f:
            text_content = f.read()
        
        # Text statistics
        lines = text_content.split('\n')
        words = text_content.split()
        non_empty_lines = [line for line in lines if line.strip()]
        
        print(f"📊 Text Statistics:")
        print(f"   📝 Total characters: {len(text_content):,}")
        print(f"   📄 Total lines: {len(lines):,}")
        print(f"   📝 Non-empty lines: {len(non_empty_lines):,}")
        print(f"   🔤 Total words: {len(words):,}")
        if non_empty_lines:
            print(f"   📏 Average words per line: {len(words)/len(non_empty_lines):.1f}")
        
        # Show first few lines of text
        print(f"\n📖 First 10 lines of extracted text:")
        for i, line in enumerate(non_empty_lines[:10]):
            if line.strip():
                print(f"   {i+1:2d}: {line.strip()}")
        
        # Show text quality indicators
        print(f"\n🎯 Text Quality Indicators:")
        
        # Count special characters that might indicate OCR errors
        special_chars = sum(1 for c in text_content if not c.isalnum() and c not in ' \n\t.,!?;:-()[]{}"\'/\\')
        print(f"   🔍 Special characters: {special_chars} ({special_chars/len(text_content)*100:.1f}%)")
        
        # Count potential OCR errors (single characters on lines)
        single_char_lines = sum(1 for line in non_empty_lines if len(line.strip()) == 1)
        print(f"   ⚠️  Single character lines: {single_char_lines}")
        
        # Count very short lines (might be OCR fragments)
        short_lines = sum(1 for line in non_empty_lines if len(line.strip()) < 3)
        print(f"   📏 Very short lines (<3 chars): {short_lines}")
        
    else:
        print("❌ Extracted text file not found")

def compare_sessions():
    """Compare multiple OCR sessions if available."""
    ocr_data_dir = Path("data/ocr_extractions")
    
    if not ocr_data_dir.exists():
        return
    
    session_dirs = [d for d in ocr_data_dir.iterdir() 
                   if d.is_dir() and not d.name in ['images', 'extracted_text', 'preprocessed_images', 'metadata']]
    
    if len(session_dirs) < 2:
        print("\n💡 Only one session found - no comparison available")
        return
    
    print(f"\n📊 SESSION COMPARISON")
    print("=" * 60)
    
    session_data = []
    for session_dir in session_dirs:
        metadata_file = session_dir / "metadata.json"
        if metadata_file.exists():
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
            session_data.append({
                'name': session_dir.name,
                'engine': metadata.get('ocr_engine', 'unknown'),
                'pages': metadata.get('num_pages', 0),
                'text_length': metadata.get('text_length', 0),
                'timestamp': metadata.get('timestamp', 'unknown')
            })
    
    # Sort by timestamp (most recent first)
    session_data.sort(key=lambda x: x['timestamp'], reverse=True)
    
    print(f"📋 Comparison of {len(session_data)} sessions:")
    print()
    print(f"{'Session':<50} {'Engine':<12} {'Pages':<6} {'Text Len':<10} {'Timestamp':<15}")
    print("-" * 100)
    
    for data in session_data:
        name_short = data['name'][:47] + "..." if len(data['name']) > 50 else data['name']
        print(f"{name_short:<50} {data['engine']:<12} {data['pages']:<6} {data['text_length']:<10} {data['timestamp']:<15}")

def run_new_extraction():
    """Run a new extraction to generate fresh data."""
    print("\n🚀 RUNNING NEW EXTRACTION")
    print("=" * 60)
    
    test_file = "test_files/huynhroger_4489590_79107742_CMPE-148_ Networking Homework .pdf"
    
    if not os.path.exists(test_file):
        print(f"❌ Test file not found: {test_file}")
        return
    
    try:
        from extraction_service_minimal import extract_with_tesseract, OCR_DATA_DIR
        
        print("🔍 Running Tesseract OCR extraction...")
        start_time = datetime.now()
        
        result = extract_with_tesseract(test_file, save_data=True)
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        if result:
            print(f"✅ Extraction successful!")
            print(f"   📝 Extracted {len(result):,} characters")
            print(f"   ⏱️  Processing time: {processing_time:.1f} seconds")
            print(f"   🚀 Speed: {len(result)/processing_time:.0f} chars/sec")
            print(f"   📁 Data saved to: {OCR_DATA_DIR}")
        else:
            print("❌ Extraction failed")
            
    except Exception as e:
        print(f"❌ Error during extraction: {e}")

def main():
    """Main analysis function."""
    print("🧪 COMPREHENSIVE OCR DATA ANALYSIS")
    print("=" * 80)
    
    # Check if we have existing data
    ocr_data_dir = Path("data/ocr_extractions")
    
    if not ocr_data_dir.exists() or not any(ocr_data_dir.iterdir()):
        print("📭 No existing OCR data found. Running new extraction...")
        run_new_extraction()
        print()
    
    # Analyze all sessions
    analyze_extraction_sessions()
    
    # Compare sessions if multiple exist
    compare_sessions()
    
    print(f"\n🎯 ANALYSIS COMPLETE")
    print("=" * 60)
    print("💡 Tips:")
    print("   • Check original_images/ to see source quality")
    print("   • Compare preprocessed_images/ to see processing effects")
    print("   • Review extracted_text.txt for OCR accuracy")
    print("   • Use metadata.json for processing details")

if __name__ == "__main__":
    main() 