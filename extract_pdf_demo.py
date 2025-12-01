#!/usr/bin/env python3
"""
Demo script to extract content from the networking homework PDF.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.append(str(Path(__file__).parent / "backend"))

def extract_pdf_content():
    """Extract content from the networking homework PDF."""
    
    # Path to the PDF file
    pdf_path = r"C:\Users\mohan\Downloads\CMPE148\submissions_Netwrking\huynhroger_4489590_79107742_CMPE-148_ Networking Homework .pdf"
    
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}")
        return
    
    print("="*80)
    print("PDF CONTENT EXTRACTION DEMO")
    print("="*80)
    print(f"File: {pdf_path}")
    print(f"File size: {os.path.getsize(pdf_path)} bytes")
    print("="*80)
    
    try:
        # Import the enhanced extraction functions
        from backend.extraction_service_v2 import (
            extract_networking_homework_content,
            extract_academic_content_enhanced,
            enhance_networking_content
        )
        
        print("\n1. Attempting specialized networking extraction...")
        networking_content = extract_networking_homework_content(pdf_path)
        
        if networking_content:
            print(f"✓ Successfully extracted {len(networking_content)} characters")
            print("\n" + "="*80)
            print("EXTRACTED NETWORKING CONTENT:")
            print("="*80)
            print(networking_content)
            print("="*80)
            
            # Save the extracted content
            output_file = "extracted_networking_content.txt"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(networking_content)
            print(f"\n✓ Extracted content saved to: {output_file}")
            
        else:
            print("⚠️ Specialized networking extraction failed, trying general extraction...")
            
            # Try general academic extraction
            general_content = extract_academic_content_enhanced(pdf_path)
            
            if general_content:
                print(f"✓ Successfully extracted {len(general_content)} characters using general extraction")
                print("\n" + "="*80)
                print("EXTRACTED GENERAL CONTENT:")
                print("="*80)
                print(general_content)
                print("="*80)
                
                # Apply networking enhancements to the general content
                enhanced_content = enhance_networking_content(general_content)
                
                print("\n" + "="*80)
                print("ENHANCED NETWORKING CONTENT:")
                print("="*80)
                print(enhanced_content)
                print("="*80)
                
                # Save the enhanced content
                output_file = "enhanced_networking_content.txt"
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(enhanced_content)
                print(f"\n✓ Enhanced content saved to: {output_file}")
                
            else:
                print("❌ All extraction methods failed")
                
    except ImportError as e:
        print(f"Error importing extraction functions: {e}")
        print("Trying alternative extraction methods...")
        
        # Try using PyMuPDF directly
        try:
            import fitz  # PyMuPDF
            
            print("\n2. Using PyMuPDF for direct PDF extraction...")
            doc = fitz.open(pdf_path)
            
            extracted_text = ""
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text = page.get_text()
                extracted_text += f"\n--- Page {page_num + 1} ---\n{text}\n"
            
            doc.close()
            
            if extracted_text.strip():
                print(f"✓ Successfully extracted {len(extracted_text)} characters using PyMuPDF")
                print("\n" + "="*80)
                print("RAW PDF CONTENT:")
                print("="*80)
                print(extracted_text)
                print("="*80)
                
                # Save the raw content
                output_file = "raw_pdf_content.txt"
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(extracted_text)
                print(f"\n✓ Raw content saved to: {output_file}")
                
                # Apply simple enhancements
                enhanced = enhance_networking_content_simple(extracted_text)
                
                print("\n" + "="*80)
                print("ENHANCED CONTENT:")
                print("="*80)
                print(enhanced)
                print("="*80)
                
                # Save the enhanced content
                output_file = "enhanced_content.txt"
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(enhanced)
                print(f"\n✓ Enhanced content saved to: {output_file}")
                
            else:
                print("❌ PyMuPDF extraction returned empty content")
                
        except ImportError:
            print("❌ PyMuPDF not available")
        except Exception as e:
            print(f"❌ PyMuPDF extraction failed: {e}")
    
    except Exception as e:
        print(f"❌ Extraction failed: {e}")
        import traceback
        traceback.print_exc()

def enhance_networking_content_simple(text: str) -> str:
    """Simple networking content enhancement."""
    import re
    
    if not text:
        return ""
    
    enhanced = text
    
    # Fix common networking terminology
    networking_fixes = {
        "subnet ting": "subnetting",
        "IP v6": "IPv6", 
        "IP v4": "IPv4",
        "broad cast": "broadcast",
        "net work": "network",
        "rout ing": "routing",
        "ad dress": "address",
        "pre fix": "prefix",
        "sub net": "subnet",
        "ag gregation": "aggregation",
        "super netting": "supernetting",
        "class ful": "classful",
        "class less": "classless",
        "dis tance": "distance",
        "vec tor": "vector",
        "link state": "link-state",
        "pro tocol": "protocol",
        "band width": "bandwidth",
        "de lay": "delay",
        "lat ency": "latency"
    }
    
    for wrong, correct in networking_fixes.items():
        enhanced = enhanced.replace(wrong, correct)
    
    # Fix IPv6 address formatting
    enhanced = re.sub(r'(\d+):\s*(\d+)', r'\1:\2', enhanced)
    enhanced = re.sub(r'([a-fA-F0-9]+):\s*([a-fA-F0-9]+)', r'\1:\2', enhanced)
    
    # Fix IPv4 address formatting
    enhanced = re.sub(r'(\d+)\.\s*(\d+)\.\s*(\d+)\.\s*(\d+)', r'\1.\2.\3.\4', enhanced)
    
    # Fix subnet mask notation
    enhanced = re.sub(r'(\d+)\.\s*(\d+)\.\s*(\d+)\.\s*(\d+)\s*/\s*(\d+)', r'\1.\2.\3.\4/\5', enhanced)
    
    # Clean up excessive whitespace
    enhanced = re.sub(r'\s+', ' ', enhanced)
    enhanced = re.sub(r'\n\s*\n\s*\n+', '\n\n', enhanced)
    
    return enhanced.strip()

if __name__ == "__main__":
    extract_pdf_content()
    
    print("\n" + "="*80)
    print("PDF EXTRACTION DEMO COMPLETED")
    print("="*80) 