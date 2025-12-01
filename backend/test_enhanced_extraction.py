#!/usr/bin/env python3
"""
Test script for enhanced content extraction from networking homework PDF.
"""

import os
import sys
import logging
from pathlib import Path

# Add the backend directory to the path
sys.path.append(str(Path(__file__).parent))

from extraction_service_v2 import (
    extract_networking_homework_content,
    extract_academic_content_enhanced,
    enhance_networking_content
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_enhanced_extraction():
    """Test the enhanced extraction on the networking homework PDF."""
    
    # Path to the networking homework PDF
    pdf_path = "test_files/huynhroger_4489590_79107742_CMPE-148_ Networking Homework .pdf"
    
    if not os.path.exists(pdf_path):
        logger.error(f"PDF file not found: {pdf_path}")
        return
    
    logger.info("Starting enhanced extraction test...")
    
    try:
        # Test the specialized networking homework extraction
        logger.info("Testing specialized networking homework extraction...")
        networking_content = extract_networking_homework_content(pdf_path)
        
        if networking_content:
            logger.info(f"Successfully extracted {len(networking_content)} characters")
            logger.info("Extracted content:")
            print("\n" + "="*80)
            print("ENHANCED NETWORKING HOMEWORK CONTENT:")
            print("="*80)
            print(networking_content)
            print("="*80)
            
            # Save the extracted content to a file for review
            output_file = "enhanced_networking_content.txt"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(networking_content)
            logger.info(f"Extracted content saved to: {output_file}")
            
        else:
            logger.error("Failed to extract content")
            
    except Exception as e:
        logger.error(f"Extraction test failed: {e}")
        import traceback
        traceback.print_exc()

def test_content_enhancement():
    """Test the content enhancement functions with sample text."""
    
    # Sample text that might come from OCR
    sample_text = """
    Roger Huynh 10/3/24 CMPE-142 Networking Homework
    
    1. Subnet ting and Address Allocation: 2 points.
    Better Zelle has been assigned the IP v6 ad dress block 2001: 0db8: 85a3::/48 and wants to create 100 sub nets for different departments.
    
    A. Question: What pre fix length should each sub net use, and how many available ad dresses will each sub net have? How would you represent the first and last ad dress of the first sub net?
    
    2. IP v6 Ad dress Compression:, 1 point.
    Given the following uncompressed IP v6 ad dress: fe80: 0000: 0000: 0000: 0202: b3ff: fe1e: 8329
    
    a. Question: Compress this IP v6 ad dress as much as possible. Then explain the steps and rules you followed to compress the ad dress.
    
    3. Hierarchical IP Design: 2 points.
    You are a net work administrator tasked with designing an efficient IP ad dressing scheme for Better Zelle with 10 different regional offices. Each region must support at least 10, 000 devices, and the company plans to use both IP v4 and IP v6.
    
    A. Question: Propose an IP ad dressing scheme for both IP v4 and IP v6 that optimizes rout ing, scalability, and ad dress utilization.
    """
    
    logger.info("Testing content enhancement...")
    
    # Test the networking content enhancement
    enhanced = enhance_networking_content(sample_text)
    
    print("\n" + "="*80)
    print("ORIGINAL SAMPLE TEXT:")
    print("="*80)
    print(sample_text)
    print("\n" + "="*80)
    print("ENHANCED NETWORKING CONTENT:")
    print("="*80)
    print(enhanced)
    print("="*80)

if __name__ == "__main__":
    logger.info("Starting enhanced extraction tests...")
    
    # Test content enhancement with sample text
    test_content_enhancement()
    
    # Test actual PDF extraction
    test_enhanced_extraction()
    
    logger.info("Enhanced extraction tests completed.") 