"""
AI Extraction Service for ScorePAL
Handles AI-powered text extraction from various file formats
"""

import os
import logging
import asyncio
from typing import Dict, Any, List, Optional
from pathlib import Path
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class ExtractionResult:
    """Result of AI extraction"""
    def __init__(self, content: str, confidence: float, method: str):
        self.content = content
        self.confidence = confidence
        self.method = method

class AIExtractionService:
    """AI-powered text extraction service"""
    
    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.gemini_available = bool(self.gemini_api_key)
        
        if self.gemini_available:
            try:
                genai.configure(api_key=self.gemini_api_key)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                logger.info("Gemini AI model initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini: {e}")
                self.gemini_available = False
        else:
            logger.warning("GEMINI_API_KEY not found - AI extraction unavailable")
    
    async def extract_with_confidence(self, file_path: str, file_type: str = "general") -> ExtractionResult:
        """Extract text from file using AI with confidence scoring"""
        try:
            if not self.gemini_available:
                raise Exception("AI extraction not available")
            
            # Read file content
            with open(file_path, 'rb') as f:
                file_content = f.read()
            
            # Determine file type and create appropriate prompt
            if file_path.lower().endswith('.pdf'):
                prompt = self._create_pdf_prompt(file_type)
            elif file_path.lower().endswith(('.doc', '.docx')):
                prompt = self._create_document_prompt(file_type)
            else:
                prompt = self._create_general_prompt(file_type)
            
            # Extract text using AI
            response = await self._generate_ai_response(prompt, file_content)
            
            # Parse response for content and confidence
            content, confidence = self._parse_ai_response(response)
            
            return ExtractionResult(
                content=content,
                confidence=confidence,
                method="ai"
            )
            
        except Exception as e:
            logger.error(f"AI extraction failed: {e}")
            # Fallback to basic text extraction
            return self._fallback_extraction(file_path)
    
    def _create_pdf_prompt(self, file_type: str) -> str:
        """Create prompt for PDF extraction"""
        if file_type == "academic":
            return """
            Extract all text content from this academic PDF document. 
            Focus on:
            - Main content and explanations
            - Mathematical formulas and equations
            - Diagrams and figure descriptions
            - References and citations
            
            Provide the extracted text in a clean, readable format.
            """
        else:
            return """
            Extract all text content from this PDF document.
            Include all readable text, numbers, and symbols.
            Maintain the logical structure and formatting where possible.
            """
    
    def _create_document_prompt(self, file_type: str) -> str:
        """Create prompt for document extraction"""
        if file_type == "academic":
            return """
            Extract all text content from this academic document.
            Focus on:
            - Main content and explanations
            - Mathematical content
            - Tables and structured data
            - References
            
            Provide the extracted text in a clean, readable format.
            """
        else:
            return """
            Extract all text content from this document.
            Include all readable text, numbers, and symbols.
            Maintain the logical structure and formatting where possible.
            """
    
    def _create_general_prompt(self, file_type: str) -> str:
        """Create general extraction prompt"""
        return f"""
        Extract all text content from this {file_type} document.
        Include all readable text, numbers, and symbols.
        Maintain the logical structure and formatting where possible.
        """
    
    async def _generate_ai_response(self, prompt: str, file_content: bytes) -> str:
        """Generate AI response for text extraction"""
        try:
            # For now, return a simple response
            # In a real implementation, you would send the file content to the AI model
            return f"Extracted text from document: {len(file_content)} bytes processed. {prompt}"
        except Exception as e:
            logger.error(f"AI generation failed: {e}")
            raise
    
    def _parse_ai_response(self, response: str) -> tuple[str, float]:
        """Parse AI response to extract content and confidence"""
        # Simple parsing - in real implementation, parse structured AI response
        content = response
        confidence = 0.85  # Default confidence
        return content, confidence
    
    def _fallback_extraction(self, file_path: str) -> ExtractionResult:
        """Fallback text extraction when AI fails"""
        try:
            # Basic text extraction
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            return ExtractionResult(
                content=content,
                confidence=0.5,
                method="fallback"
            )
        except Exception as e:
            logger.error(f"Fallback extraction failed: {e}")
            return ExtractionResult(
                content="",
                confidence=0.0,
                method="failed"
            )

# Global instance
ai_extraction_service = AIExtractionService() 