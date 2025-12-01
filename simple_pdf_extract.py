#!/usr/bin/env python3
"""
Simple PDF extraction using PyMuPDF.
"""

import os
import re

def extract_pdf_simple():
    """Extract content from the networking homework PDF using PyMuPDF."""
    
    # Path to the PDF file
    pdf_path = r"C:\Users\mohan\Downloads\CMPE148\submissions_Netwrking\huynhroger_4489590_79107742_CMPE-148_ Networking Homework .pdf"
    
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}")
        return
    
    print("="*80)
    print("SIMPLE PDF CONTENT EXTRACTION")
    print("="*80)
    print(f"File: {pdf_path}")
    print(f"File size: {os.path.getsize(pdf_path)} bytes")
    print("="*80)
    
    try:
        import fitz  # PyMuPDF
        
        print("\nExtracting content using PyMuPDF...")
        doc = fitz.open(pdf_path)
        
        extracted_text = ""
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            extracted_text += f"\n--- Page {page_num + 1} ---\n{text}\n"
        
        doc.close()
        
        if extracted_text.strip():
            print(f"✓ Successfully extracted {len(extracted_text)} characters")
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
            
            # Apply networking enhancements
            enhanced = enhance_networking_content_simple(extracted_text)
            
            print("\n" + "="*80)
            print("ENHANCED NETWORKING CONTENT:")
            print("="*80)
            print(enhanced)
            print("="*80)
            
            # Save the enhanced content
            output_file = "enhanced_networking_content.txt"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(enhanced)
            print(f"\n✓ Enhanced content saved to: {output_file}")
            
            # Show improvements made
            show_improvements(extracted_text, enhanced)
            
        else:
            print("❌ PyMuPDF extraction returned empty content")
            
    except ImportError:
        print("❌ PyMuPDF not available. Please install it with: pip install PyMuPDF")
    except Exception as e:
        print(f"❌ PyMuPDF extraction failed: {e}")
        import traceback
        traceback.print_exc()

def enhance_networking_content_simple(text: str) -> str:
    """Simple networking content enhancement."""
    
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

def show_improvements(original: str, enhanced: str):
    """Show specific improvements made to the content."""
    
    print("\n" + "="*80)
    print("IMPROVEMENTS MADE:")
    print("="*80)
    
    improvements = [
        ("subnet ting", "subnetting"),
        ("IP v6", "IPv6"),
        ("ad dress", "address"),
        ("pre fix", "prefix"),
        ("sub net", "subnet"),
        ("net work", "network"),
        ("rout ing", "routing"),
        ("broad cast", "broadcast"),
        ("ag gregation", "aggregation"),
        ("super netting", "supernetting"),
        ("class ful", "classful"),
        ("class less", "classless"),
        ("dis tance", "distance"),
        ("vec tor", "vector"),
        ("link state", "link-state"),
        ("pro tocol", "protocol"),
        ("band width", "bandwidth"),
        ("de lay", "delay"),
        ("lat ency", "latency")
    ]
    
    found_improvements = []
    for wrong, correct in improvements:
        if wrong in original:
            found_improvements.append((wrong, correct))
    
    if found_improvements:
        print("Technical term corrections:")
        for wrong, correct in found_improvements:
            print(f"  ✓ '{wrong}' → '{correct}'")
    else:
        print("No technical term corrections needed.")
    
    # Check for IP address improvements
    ipv6_pattern = r'\d+:\s*\d+'
    ipv4_pattern = r'\d+\.\s*\d+\.\s*\d+\.\s*\d+'
    
    if re.search(ipv6_pattern, original):
        print("  ✓ IPv6 address formatting improved")
    if re.search(ipv4_pattern, original):
        print("  ✓ IPv4 address formatting improved")
    
    print(f"\nContent length: {len(original)} → {len(enhanced)} characters")

if __name__ == "__main__":
    extract_pdf_simple()
    
    print("\n" + "="*80)
    print("PDF EXTRACTION COMPLETED")
    print("="*80) 