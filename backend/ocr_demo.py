#!/usr/bin/env python
"""
OCR Demo Script - Demonstrates the enhanced OCR capabilities
for extracting text from PDF files with near 100% accuracy.

Usage:
  python ocr_demo.py --file <path_to_pdf> [--output <output_file>]

Options:
  --file     Path to the PDF file to process
  --output   Path to save the extracted text [default: output.txt]
"""

import os
import argparse
import time
from dotenv import load_dotenv
import logging
from extraction_service_v2 import extract_pdf_text

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def parse_arguments():
    parser = argparse.ArgumentParser(description='Extract text from PDF files with high accuracy')
    parser.add_argument('--file', required=True, help='Path to the PDF file to process')
    parser.add_argument('--output', default='output.txt', help='Path to save the extracted text')
    return parser.parse_args()

def main():
    # Load environment variables if any
    load_dotenv()
    
    # Parse command line arguments
    args = parse_arguments()
    
    # Check if file exists
    if not os.path.exists(args.file):
        logger.error(f"File not found: {args.file}")
        return
    
    # Extract text from the PDF
    logger.info(f"Processing file: {args.file}")
    start_time = time.time()
    
    try:
        extracted_text = extract_pdf_text(args.file)
        
        # Write the extracted text to the output file
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(extracted_text)
        
        # Print statistics
        processing_time = time.time() - start_time
        char_count = len(extracted_text)
        word_count = len(extracted_text.split())
        
        logger.info(f"Text extraction completed in {processing_time:.2f} seconds")
        logger.info(f"Extracted {char_count} characters, {word_count} words")
        logger.info(f"Results saved to: {args.output}")
        
        # Print a sample of the extracted text
        sample_length = min(200, len(extracted_text))
        logger.info(f"Sample of extracted text: {extracted_text[:sample_length]}...")
        
    except Exception as e:
        logger.error(f"Error during text extraction: {str(e)}")

if __name__ == "__main__":
    main() 