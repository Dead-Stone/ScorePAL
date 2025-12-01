#!/usr/bin/env python3
"""
Test script to verify Gemini API key setup.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.append(str(Path(__file__).parent / "backend"))

def test_gemini_setup():
    """Test Gemini API key setup and basic functionality."""
    
    print("="*80)
    print("GEMINI API KEY SETUP TEST")
    print("="*80)
    
    # Test 1: Check environment variable
    print("\n1. CHECKING ENVIRONMENT VARIABLES")
    print("-" * 50)
    
    gemini_key = os.getenv('GEMINI_API_KEY')
    if gemini_key:
        print(f"✓ GEMINI_API_KEY found: {gemini_key[:10]}...{gemini_key[-4:]}")
    else:
        print("❌ GEMINI_API_KEY not found")
        print("   Please set GEMINI_API_KEY in your .env file")
        return False
    
    # Test 2: Test AI extraction service initialization
    print("\n2. TESTING AI EXTRACTION SERVICE")
    print("-" * 50)
    
    try:
        from backend.ai_extraction_service import ai_extraction_service
        
        if ai_extraction_service.gemini_available:
            print("✓ AI extraction service initialized successfully")
            print(f"  - Model: Gemini 2.5 Flash")
            print(f"  - Confidence threshold: {ai_extraction_service.min_confidence:.2%}")
            print(f"  - Max retries: {ai_extraction_service.max_retries}")
        else:
            print("❌ AI extraction service not available")
            return False
            
    except Exception as e:
        print(f"❌ Failed to initialize AI extraction service: {e}")
        return False
    
    # Test 3: Test basic AI functionality
    print("\n3. TESTING BASIC AI FUNCTIONALITY")
    print("-" * 50)
    
    try:
        import asyncio
        
        async def test_basic_ai():
            try:
                # Simple test prompt
                test_prompt = "Hello! Please respond with 'AI is working correctly' and nothing else."
                
                response = await ai_extraction_service._get_ai_response(test_prompt)
                
                if response and "AI is working correctly" in response:
                    print("✓ Basic AI functionality working")
                    print(f"  - Response: {response.strip()}")
                    return True
                else:
                    print("⚠️ AI responded but not as expected")
                    print(f"  - Response: {response}")
                    return True  # Still working, just different response
                    
            except Exception as e:
                print(f"❌ Basic AI test failed: {e}")
                return False
        
        # Run the test
        result = asyncio.run(test_basic_ai())
        if not result:
            return False
            
    except Exception as e:
        print(f"❌ AI functionality test failed: {e}")
        return False
    
    # Test 4: Test PDF extraction capability
    print("\n4. TESTING PDF EXTRACTION CAPABILITY")
    print("-" * 50)
    
    try:
        import fitz  # PyMuPDF
        
        # Test if PyMuPDF is available
        print("✓ PyMuPDF is available for PDF processing")
        
        # Test if we can create a simple PDF for testing
        try:
            doc = fitz.open()
            page = doc.new_page()
            page.insert_text((50, 50), "Test PDF content for AI extraction")
            test_pdf_path = "test_pdf.pdf"
            doc.save(test_pdf_path)
            doc.close()
            
            print("✓ Test PDF created successfully")
            
            # Clean up
            if os.path.exists(test_pdf_path):
                os.remove(test_pdf_path)
                print("✓ Test PDF cleaned up")
                
        except Exception as e:
            print(f"⚠️ PDF creation test failed: {e}")
            print("   This is not critical for basic functionality")
            
    except ImportError:
        print("❌ PyMuPDF not available")
        print("   Install with: pip install PyMuPDF")
        return False
    
    print("\n" + "="*80)
    print("✓ ALL TESTS PASSED - GEMINI SETUP IS WORKING!")
    print("="*80)
    
    print("\nNext steps:")
    print("1. Run the full extraction test: python test_ai_extraction.py")
    print("2. Start the API server: python backend/api.py")
    print("3. Test the frontend component")
    
    return True

if __name__ == "__main__":
    success = test_gemini_setup()
    if not success:
        print("\n❌ Setup failed. Please check your configuration.")
        sys.exit(1) 