#!/usr/bin/env python
"""
OCR Performance Test Script
Tests all available OCR engines and provides performance comparison.

Usage:
  python ocr_test.py --file <path_to_pdf> [--output-dir <output_directory>]
"""

import os
import argparse
import time
import json
from pathlib import Path
from typing import Dict, List, Tuple
from dotenv import load_dotenv
import logging

# Import OCR functions
from extraction_service_v2 import (
    extract_with_tesseract, extract_with_paddleocr, extract_with_easyocr,
    extract_with_unstructured, detect_document_type,
    tesseract_available, paddle_available, easyocr_available, unstructured_available
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_ocr_engine(engine_name: str, extract_func, file_path: str) -> Dict:
    """Test a single OCR engine and return performance metrics."""
    logger.info(f"Testing {engine_name}...")
    
    start_time = time.time()
    try:
        extracted_text = extract_func(file_path)
        processing_time = time.time() - start_time
        
        # Calculate metrics
        char_count = len(extracted_text)
        word_count = len(extracted_text.split())
        line_count = len(extracted_text.split('\n'))
        
        return {
            "engine": engine_name,
            "success": True,
            "processing_time": round(processing_time, 2),
            "character_count": char_count,
            "word_count": word_count,
            "line_count": line_count,
            "text_sample": extracted_text[:200] + "..." if len(extracted_text) > 200 else extracted_text,
            "full_text": extracted_text,
            "error": None
        }
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"{engine_name} failed: {str(e)}")
        return {
            "engine": engine_name,
            "success": False,
            "processing_time": round(processing_time, 2),
            "character_count": 0,
            "word_count": 0,
            "line_count": 0,
            "text_sample": "",
            "full_text": "",
            "error": str(e)
        }

def run_comprehensive_test(file_path: str, output_dir: str = None) -> Dict:
    """Run comprehensive OCR test on all available engines."""
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Detect document type
    doc_type = detect_document_type(file_path)
    logger.info(f"Detected document type: {doc_type}")
    
    # Prepare test results
    results = {
        "file_path": file_path,
        "document_type": doc_type,
        "test_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "engines_tested": [],
        "engine_results": [],
        "summary": {}
    }
    
    # Test available engines
    engines_to_test = []
    
    if tesseract_available:
        engines_to_test.append(("Tesseract", extract_with_tesseract))
    
    if paddle_available:
        engines_to_test.append(("PaddleOCR", extract_with_paddleocr))
    
    if easyocr_available:
        engines_to_test.append(("EasyOCR", extract_with_easyocr))
    
    if unstructured_available:
        engines_to_test.append(("UnstructuredIO", extract_with_unstructured))
    
    if not engines_to_test:
        logger.error("No OCR engines available for testing!")
        return results
    
    # Run tests
    for engine_name, extract_func in engines_to_test:
        result = test_ocr_engine(engine_name, extract_func, file_path)
        results["engine_results"].append(result)
        results["engines_tested"].append(engine_name)
    
    # Generate summary
    successful_results = [r for r in results["engine_results"] if r["success"]]
    
    if successful_results:
        # Find best performing engine
        best_by_content = max(successful_results, key=lambda x: x["character_count"])
        fastest_engine = min(successful_results, key=lambda x: x["processing_time"])
        
        results["summary"] = {
            "total_engines_tested": len(engines_to_test),
            "successful_engines": len(successful_results),
            "failed_engines": len(engines_to_test) - len(successful_results),
            "best_content_extraction": {
                "engine": best_by_content["engine"],
                "character_count": best_by_content["character_count"],
                "word_count": best_by_content["word_count"]
            },
            "fastest_engine": {
                "engine": fastest_engine["engine"],
                "processing_time": fastest_engine["processing_time"]
            },
            "recommended_engine": best_by_content["engine"]
        }
    else:
        results["summary"] = {
            "total_engines_tested": len(engines_to_test),
            "successful_engines": 0,
            "failed_engines": len(engines_to_test),
            "error": "All OCR engines failed"
        }
    
    # Save results if output directory specified
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        
        # Save detailed results
        results_file = Path(output_dir) / "ocr_test_results.json"
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        # Save extracted text from each engine
        for result in results["engine_results"]:
            if result["success"] and result["full_text"]:
                text_file = Path(output_dir) / f"{result['engine']}_extracted_text.txt"
                with open(text_file, 'w', encoding='utf-8') as f:
                    f.write(result["full_text"])
        
        logger.info(f"Test results saved to: {output_dir}")
    
    return results

def print_test_summary(results: Dict):
    """Print a formatted summary of test results."""
    print("\n" + "="*60)
    print("OCR ENGINE PERFORMANCE TEST RESULTS")
    print("="*60)
    
    print(f"File: {results['file_path']}")
    print(f"Document Type: {results['document_type']}")
    print(f"Test Time: {results['test_timestamp']}")
    print()
    
    if "error" in results["summary"]:
        print(f"❌ {results['summary']['error']}")
        return
    
    print("ENGINE PERFORMANCE:")
    print("-" * 40)
    
    for result in results["engine_results"]:
        status = "✅" if result["success"] else "❌"
        print(f"{status} {result['engine']:<15} | "
              f"Time: {result['processing_time']:<6}s | "
              f"Chars: {result['character_count']:<6} | "
              f"Words: {result['word_count']:<6}")
        
        if not result["success"]:
            print(f"   Error: {result['error']}")
        elif result["text_sample"]:
            print(f"   Sample: {result['text_sample'][:100]}...")
        print()
    
    print("SUMMARY:")
    print("-" * 40)
    summary = results["summary"]
    print(f"✅ Successful engines: {summary['successful_engines']}/{summary['total_engines_tested']}")
    
    if summary["successful_engines"] > 0:
        print(f"🏆 Best content extraction: {summary['best_content_extraction']['engine']} "
              f"({summary['best_content_extraction']['character_count']} chars)")
        print(f"⚡ Fastest engine: {summary['fastest_engine']['engine']} "
              f"({summary['fastest_engine']['processing_time']}s)")
        print(f"💡 Recommended: {summary['recommended_engine']}")

def parse_arguments():
    parser = argparse.ArgumentParser(description='Test OCR engine performance')
    parser.add_argument('--file', required=True, help='Path to the file to test')
    parser.add_argument('--output-dir', help='Directory to save test results')
    return parser.parse_args()

def main():
    load_dotenv()
    
    args = parse_arguments()
    
    try:
        # Run comprehensive test
        results = run_comprehensive_test(args.file, args.output_dir)
        
        # Print summary
        print_test_summary(results)
        
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main()) 