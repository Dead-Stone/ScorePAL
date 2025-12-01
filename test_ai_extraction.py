#!/usr/bin/env python3
"""
Comprehensive test script for AI-powered PDF extraction with confidence scoring.
"""

import os
import sys
import asyncio
import time
from pathlib import Path

# Add the backend directory to the path
sys.path.append(str(Path(__file__).parent / "backend"))

def test_extraction_methods():
    """Test both OCR and AI extraction methods."""
    
    # Path to the networking homework PDF
    pdf_path = r"C:\Users\mohan\Downloads\CMPE148\submissions_Netwrking\huynhroger_4489590_79107742_CMPE-148_ Networking Homework .pdf"
    
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}")
        return
    
    print("="*80)
    print("COMPREHENSIVE EXTRACTION METHOD TESTING")
    print("="*80)
    print(f"File: {pdf_path}")
    print(f"File size: {os.path.getsize(pdf_path)} bytes")
    print("="*80)
    
    # Test 1: Traditional OCR Extraction
    print("\n1. TESTING TRADITIONAL OCR EXTRACTION")
    print("-" * 50)
    
    try:
        from backend.extraction_service_v2 import extract_academic_content_enhanced
        
        start_time = time.time()
        ocr_content = extract_academic_content_enhanced(pdf_path)
        ocr_time = time.time() - start_time
        
        if ocr_content:
            print(f"✓ OCR Extraction Successful")
            print(f"  - Characters extracted: {len(ocr_content)}")
            print(f"  - Processing time: {ocr_time:.2f} seconds")
            print(f"  - Confidence score: 75% (default)")
            
            # Save OCR result
            with open("ocr_extraction_result.txt", "w", encoding="utf-8") as f:
                f.write(ocr_content)
            print(f"  - Saved to: ocr_extraction_result.txt")
        else:
            print("❌ OCR extraction failed")
            
    except Exception as e:
        print(f"❌ OCR extraction error: {e}")
    
    # Test 2: AI-Powered Extraction
    print("\n2. TESTING AI-POWERED EXTRACTION (GEMINI 2.5 FLASH)")
    print("-" * 50)
    
    try:
        from backend.ai_extraction_service import ai_extraction_service
        
        if not ai_extraction_service.gemini_available:
            print("⚠️ Gemini AI not available. Please check GOOGLE_API_KEY configuration.")
            print("   To enable AI extraction, set the GOOGLE_API_KEY environment variable.")
        else:
            print("✓ Gemini 2.5 Flash is available")
            
            # Test AI extraction
            async def test_ai_extraction():
                try:
                    start_time = time.time()
                    result = await ai_extraction_service.extract_with_confidence(
                        pdf_path, 
                        file_type="networking_homework"
                    )
                    ai_time = time.time() - start_time
                    
                    print(f"✓ AI Extraction Successful")
                    print(f"  - Characters extracted: {len(result.content)}")
                    print(f"  - Processing time: {ai_time:.2f} seconds")
                    print(f"  - Confidence score: {result.confidence_score:.2%}")
                    print(f"  - Method: {result.extraction_method}")
                    print(f"  - Attempts: {result.metadata.get('attempt', 1)}")
                    
                    # Save AI result
                    with open("ai_extraction_result.txt", "w", encoding="utf-8") as f:
                        f.write(result.content)
                    print(f"  - Saved to: ai_extraction_result.txt")
                    
                    return result
                    
                except ValueError as e:
                    print(f"❌ AI extraction failed: {e}")
                except Exception as e:
                    print(f"❌ AI extraction error: {e}")
            
            # Run AI extraction
            asyncio.run(test_ai_extraction())
            
    except ImportError as e:
        print(f"❌ AI extraction service not available: {e}")
    except Exception as e:
        print(f"❌ AI extraction error: {e}")
    
    # Test 3: Comparison
    print("\n3. COMPARISON OF EXTRACTION METHODS")
    print("-" * 50)
    
    try:
        # Read both results if they exist
        ocr_result = ""
        ai_result = ""
        
        if os.path.exists("ocr_extraction_result.txt"):
            with open("ocr_extraction_result.txt", "r", encoding="utf-8") as f:
                ocr_result = f.read()
        
        if os.path.exists("ai_extraction_result.txt"):
            with open("ai_extraction_result.txt", "r", encoding="utf-8") as f:
                ai_result = f.read()
        
        if ocr_result and ai_result:
            print("Comparing OCR vs AI extraction results:")
            print(f"  - OCR content length: {len(ocr_result)} characters")
            print(f"  - AI content length: {len(ai_result)} characters")
            
            # Compare key technical terms
            technical_terms = [
                "IPv6", "IPv4", "subnetting", "routing", "aggregation",
                "2001:0db8:85a3::/48", "192.168.0.0/24", "fe80:0000:0000:0000:0202:b3ff:fe1e:8329"
            ]
            
            print("\nTechnical term preservation comparison:")
            for term in technical_terms:
                ocr_count = ocr_result.count(term)
                ai_count = ai_result.count(term)
                print(f"  - {term}: OCR={ocr_count}, AI={ai_count}")
            
            # Calculate similarity
            common_chars = sum(1 for a, b in zip(ocr_result, ai_result) if a == b)
            similarity = common_chars / max(len(ocr_result), len(ai_result)) * 100
            print(f"\nContent similarity: {similarity:.1f}%")
            
        elif ocr_result:
            print("Only OCR result available for comparison")
        elif ai_result:
            print("Only AI result available for comparison")
        else:
            print("No extraction results available for comparison")
            
    except Exception as e:
        print(f"❌ Comparison error: {e}")
    
    # Test 4: API Endpoints
    print("\n4. TESTING API ENDPOINTS")
    print("-" * 50)
    
    try:
        import requests
        
        # Test extraction methods endpoint
        try:
            response = requests.get("http://localhost:8000/api/extraction-methods")
            if response.status_code == 200:
                methods = response.json()
                print("✓ Extraction methods endpoint working")
                print(f"  - Available methods: {list(methods['methods'].keys())}")
                print(f"  - Recommended method: {methods['recommended']}")
            else:
                print(f"⚠️ Extraction methods endpoint returned status {response.status_code}")
        except requests.exceptions.ConnectionError:
            print("⚠️ API server not running. Start with: python backend/api.py")
        except Exception as e:
            print(f"❌ API test error: {e}")
            
    except ImportError:
        print("⚠️ Requests library not available for API testing")
    except Exception as e:
        print(f"❌ API test error: {e}")

def test_grading_workflow():
    """Test the complete AI grading workflow."""
    
    print("\n" + "="*80)
    print("TESTING AI GRADING WORKFLOW")
    print("="*80)
    
    # This would require sample files for question paper, rubric, submission, and answer key
    print("To test AI grading workflow, you would need:")
    print("1. Question paper PDF")
    print("2. Rubric PDF")
    print("3. Student submission PDF")
    print("4. Answer key PDF")
    print("\nUse the /api/grade-with-ai endpoint with these files.")
    print("Example curl command:")
    print("""
curl -X POST "http://localhost:8000/api/grade-with-ai" \\
  -F "question_paper=@question_paper.pdf" \\
  -F "rubric=@rubric.pdf" \\
  -F "student_submission=@submission.pdf" \\
  -F "answer_key=@answer_key.pdf"
""")

def show_usage_instructions():
    """Show usage instructions for the new system."""
    
    print("\n" + "="*80)
    print("USAGE INSTRUCTIONS")
    print("="*80)
    
    print("\n1. EXTRACTION METHODS:")
    print("   - Traditional OCR: Fast, 75% confidence threshold")
    print("   - AI-Powered (Gemini 2.5 Flash): High accuracy, 90% confidence threshold")
    
    print("\n2. API ENDPOINTS:")
    print("   - POST /api/extract-with-ai")
    print("     Parameters: file, file_type, method (ai|ocr)")
    print("   - POST /api/grade-with-ai")
    print("     Parameters: question_paper, rubric, student_submission, answer_key")
    print("   - GET /api/extraction-methods")
    print("     Returns available methods and their status")
    
    print("\n3. CONFIDENCE SCORING:")
    print("   - AI extraction retries up to 3 times if confidence < 90%")
    print("   - Enhanced prompts used for retry attempts")
    print("   - Processing time and metadata tracked")
    
    print("\n4. SETUP REQUIREMENTS:")
    print("   - Set GOOGLE_API_KEY environment variable for AI features")
    print("   - Install google-generativeai: pip install google-generativeai")
    print("   - Ensure PyMuPDF is available for PDF processing")
    
    print("\n5. EXAMPLE USAGE:")
    print("""
# Extract with AI
curl -X POST "http://localhost:8000/api/extract-with-ai" \\
  -F "file=@document.pdf" \\
  -F "file_type=networking_homework" \\
  -F "method=ai"

# Extract with OCR
curl -X POST "http://localhost:8000/api/extract-with-ai" \\
  -F "file=@document.pdf" \\
  -F "file_type=general" \\
  -F "method=ocr"
""")

if __name__ == "__main__":
    test_extraction_methods()
    test_grading_workflow()
    show_usage_instructions()
    
    print("\n" + "="*80)
    print("TESTING COMPLETED")
    print("="*80) 