#!/usr/bin/env python3
"""
Enhanced Image Extraction Service for ScorePAL
Uses multiple state-of-the-art AI vision models for best image analysis results.
"""

import os
import io
import base64
import json
import logging
import asyncio
import time
import random
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple, Union, Any
import cv2
import numpy as np
from PIL import Image
from functools import wraps

# Optional imports for different file formats
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
import requests
import tempfile

# AI Model imports
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic
    CLAUDE_AVAILABLE = True
except ImportError:
    CLAUDE_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Rate limiting configuration
RATE_LIMIT_CONFIG = {
    'gemini': {
        'delay_between_calls': 2.0,  # seconds between API calls
        'max_retries': 3,
        'base_retry_delay': 5.0,     # seconds to wait on first retry
        'max_retry_delay': 60.0,     # maximum retry delay
        'exponential_base': 2.0      # exponential backoff multiplier
    },
    'openai': {
        'delay_between_calls': 1.0,
        'max_retries': 3,
        'base_retry_delay': 3.0,
        'max_retry_delay': 30.0,
        'exponential_base': 2.0
    },
    'claude': {
        'delay_between_calls': 1.5,
        'max_retries': 3,
        'base_retry_delay': 4.0,
        'max_retry_delay': 45.0,
        'exponential_base': 2.0
    }
}

def rate_limit(model_name: str):
    """Decorator to add rate limiting to API calls."""
    def decorator(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            # Skip rate limiting if disabled
            if not getattr(self, 'rate_limit_enabled', True):
                return func(self, *args, **kwargs)
            
            config = RATE_LIMIT_CONFIG.get(model_name, RATE_LIMIT_CONFIG['gemini'])
            
            for attempt in range(config['max_retries'] + 1):
                try:
                    # Add delay before API call (except first call of the session)
                    if hasattr(self, f'_last_{model_name}_call'):
                        time_since_last = time.time() - getattr(self, f'_last_{model_name}_call')
                        if time_since_last < config['delay_between_calls']:
                            sleep_time = config['delay_between_calls'] - time_since_last
                            logger.info(f"Rate limiting {model_name}: waiting {sleep_time:.1f}s")
                            time.sleep(sleep_time)
                    
                    # Record call time
                    setattr(self, f'_last_{model_name}_call', time.time())
                    
                    # Make the API call
                    return func(self, *args, **kwargs)
                    
                except Exception as e:
                    error_str = str(e).lower()
                    
                    # Check if it's a rate limit error
                    if any(code in error_str for code in ['429', 'rate limit', 'quota', 'too many requests']):
                        if attempt < config['max_retries']:
                            # Calculate exponential backoff delay
                            retry_delay = min(
                                config['base_retry_delay'] * (config['exponential_base'] ** attempt),
                                config['max_retry_delay']
                            )
                            # Add some randomization to avoid thundering herd
                            jitter = random.uniform(0.1, 0.3) * retry_delay
                            total_delay = retry_delay + jitter
                            
                            logger.warning(f"{model_name} rate limit hit (attempt {attempt + 1}). Retrying in {total_delay:.1f}s")
                            time.sleep(total_delay)
                            continue
                        else:
                            logger.error(f"{model_name} rate limit exceeded after {config['max_retries']} retries")
                            raise e
                    else:
                        # Non-rate-limit error, re-raise immediately
                        raise e
            
            return None
        return wrapper
    return decorator

class EnhancedImageExtractionService:
    """Enhanced service for extracting images and generating comprehensive AI summaries."""
    
    def __init__(self):
        """Initialize the enhanced image extraction service with multiple AI models."""
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY") 
        self.claude_api_key = os.getenv("ANTHROPIC_API_KEY")
        
        # Rate limiting configuration (can be overridden via environment variables)
        self.rate_limit_enabled = os.getenv("ENABLE_RATE_LIMITING", "true").lower() == "true"
        self.batch_delay = float(os.getenv("BATCH_IMAGE_DELAY", "1.0"))  # delay between images in batch
        
        # Initialize available models
        self.available_models = []
        self._initialize_models()
        
        if self.rate_limit_enabled:
            logger.info(f"Enhanced Image Extraction Service initialized with models: {self.available_models} (Rate limiting: ON)")
        else:
            logger.info(f"Enhanced Image Extraction Service initialized with models: {self.available_models} (Rate limiting: OFF)")
    
    def configure_rate_limits(self, model_name: str, delay_between_calls: float = None, 
                            max_retries: int = None, base_retry_delay: float = None):
        """Dynamically configure rate limits for a specific model."""
        if model_name not in RATE_LIMIT_CONFIG:
            logger.warning(f"Unknown model name: {model_name}")
            return
        
        config = RATE_LIMIT_CONFIG[model_name]
        
        if delay_between_calls is not None:
            config['delay_between_calls'] = delay_between_calls
        if max_retries is not None:
            config['max_retries'] = max_retries
        if base_retry_delay is not None:
            config['base_retry_delay'] = base_retry_delay
        
        logger.info(f"Updated rate limits for {model_name}: {config}")
    
    def get_rate_limit_status(self) -> Dict[str, Any]:
        """Get current rate limiting configuration and status."""
        status = {
            'rate_limiting_enabled': self.rate_limit_enabled,
            'batch_delay': self.batch_delay,
            'models_config': RATE_LIMIT_CONFIG.copy(),
            'last_api_calls': {}
        }
        
        # Add last call timestamps
        for model in ['gemini', 'openai', 'claude']:
            last_call_attr = f'_last_{model}_call'
            if hasattr(self, last_call_attr):
                last_call_time = getattr(self, last_call_attr)
                status['last_api_calls'][model] = {
                    'timestamp': last_call_time,
                    'seconds_ago': time.time() - last_call_time
                }
        
        return status
    
    def _initialize_models(self):
        """Initialize all available AI vision models."""
        
        # Initialize Gemini
        if GEMINI_AVAILABLE and self.gemini_api_key and len(self.gemini_api_key) > 10:
            try:
                genai.configure(api_key=self.gemini_api_key)
                self.gemini_model = genai.GenerativeModel('gemini-1.5-pro')
                # Test the model with a simple call to verify it works
                # Skip for now to avoid quota issues
                self.available_models.append("gemini-1.5-pro")
                logger.info("Gemini 1.5 Pro vision model initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini: {e}")
        
        # Initialize OpenAI GPT-4V
        if OPENAI_AVAILABLE and self.openai_api_key and len(self.openai_api_key) > 10:
            try:
                self.openai_client = openai.OpenAI(api_key=self.openai_api_key)
                # Skip test for now
                self.available_models.append("gpt-4-vision-preview")
                logger.info("OpenAI GPT-4 Vision model initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI: {e}")
        
        # Initialize Claude 3.5 Sonnet
        if CLAUDE_AVAILABLE and self.claude_api_key and len(self.claude_api_key) > 10:
            try:
                self.claude_client = anthropic.Anthropic(api_key=self.claude_api_key)
                self.available_models.append("claude-3-5-sonnet")
                logger.info("Claude 3.5 Sonnet vision model initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize Claude: {e}")
        
        if not self.available_models:
            logger.info("No AI vision models available. Using computer vision fallback for image analysis.")
    
    def extract_images_from_file(self, file_path: str) -> List[Dict]:
        """Extract images from various file formats."""
        file_extension = Path(file_path).suffix.lower()
        
        if file_extension == '.pdf':
            return self._extract_images_from_pdf(file_path)
        elif file_extension in ['.docx', '.doc']:
            return self._extract_images_from_docx(file_path)
        elif file_extension in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
            return self._extract_single_image(file_path)
        else:
            logger.warning(f"Unsupported file format for image extraction: {file_extension}")
            return []
    
    def _extract_images_from_pdf(self, pdf_path: str) -> List[Dict]:
        """Enhanced PDF image extraction with better quality."""
        images = []
        
        if not PYMUPDF_AVAILABLE:
            logger.warning("PyMuPDF not available, cannot extract images from PDF")
            return images
        
        try:
            pdf_document = fitz.open(pdf_path)
            
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                image_list = page.get_images(full=True)
                
                for img_index, img in enumerate(image_list):
                    try:
                        xref = img[0]
                        pix = fitz.Pixmap(pdf_document, xref)
                        
                        if pix.n - pix.alpha < 4:  # GRAY or RGB
                            img_data = pix.tobytes("png")
                            pil_image = Image.open(io.BytesIO(img_data))
                            
                            # Enhance image quality
                            enhanced_image = self._enhance_image_quality(pil_image)
                            cv_image = cv2.cvtColor(np.array(enhanced_image), cv2.COLOR_RGB2BGR)
                            
                            height, width = cv_image.shape[:2]
                            
                            # Filter out very small images
                            if width >= 100 and height >= 100:
                                images.append({
                                    'image': cv_image,
                                    'pil_image': enhanced_image,
                                    'page_number': page_num + 1,
                                    'image_index': img_index + 1,
                                    'width': width,
                                    'height': height,
                                    'format': 'PNG',
                                    'source_type': 'pdf',
                                    'quality_score': self._calculate_image_quality(enhanced_image)
                                })
                        
                        pix = None
                    except Exception as e:
                        logger.warning(f"Error processing image {img_index} on page {page_num}: {e}")
            
            pdf_document.close()
            logger.info(f"Extracted {len(images)} high-quality images from PDF: {pdf_path}")
            
        except Exception as e:
            logger.error(f"Error extracting images from PDF {pdf_path}: {e}")
        
        return images
    
    def _extract_images_from_docx(self, docx_path: str) -> List[Dict]:
        """Enhanced DOCX image extraction."""
        images = []
        
        if not DOCX_AVAILABLE:
            logger.warning("python-docx not available, cannot extract images from DOCX")
            return images
        
        try:
            doc = Document(docx_path)
            
            for rel in doc.part.rels.values():
                if "image" in rel.target_ref:
                    try:
                        image_data = rel.target_part.blob
                        pil_image = Image.open(io.BytesIO(image_data))
                        
                        # Enhance image quality
                        enhanced_image = self._enhance_image_quality(pil_image)
                        cv_image = cv2.cvtColor(np.array(enhanced_image), cv2.COLOR_RGB2BGR)
                        
                        height, width = cv_image.shape[:2]
                        
                        if width >= 100 and height >= 100:
                            images.append({
                                'image': cv_image,
                                'pil_image': enhanced_image,
                                'page_number': 1,
                                'image_index': len(images) + 1,
                                'width': width,
                                'height': height,
                                'format': enhanced_image.format or 'Unknown',
                                'source_type': 'docx',
                                'quality_score': self._calculate_image_quality(enhanced_image)
                            })
                    
                    except Exception as e:
                        logger.warning(f"Could not process image in DOCX: {e}")
                        continue
            
            logger.info(f"Extracted {len(images)} images from DOCX: {docx_path}")
            
        except Exception as e:
            logger.error(f"Error extracting images from DOCX {docx_path}: {e}")
        
        return images
    
    def _extract_single_image(self, image_path: str) -> List[Dict]:
        """Extract and enhance a single image file."""
        try:
            pil_image = Image.open(image_path)
            enhanced_image = self._enhance_image_quality(pil_image)
            cv_image = cv2.cvtColor(np.array(enhanced_image), cv2.COLOR_RGB2BGR)
            
            height, width = cv_image.shape[:2]
            
            return [{
                'image': cv_image,
                'pil_image': enhanced_image,
                'page_number': 1,
                'image_index': 1,
                'width': width,
                'height': height,
                'format': enhanced_image.format or 'Unknown',
                'source_type': 'image',
                'quality_score': self._calculate_image_quality(enhanced_image)
            }]
            
        except Exception as e:
            logger.error(f"Error processing image {image_path}: {e}")
            return []
    
    def _enhance_image_quality(self, image: Image.Image) -> Image.Image:
        """Enhance image quality for better AI analysis."""
        try:
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Increase contrast and sharpness
            from PIL import ImageEnhance, ImageFilter
            
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.2)
            
            # Enhance sharpness
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.1)
            
            # Apply unsharp mask for better clarity
            image = image.filter(ImageFilter.UnsharpMask(radius=1, percent=150, threshold=3))
            
            return image
        except Exception as e:
            logger.warning(f"Image enhancement failed: {e}")
            return image
    
    def _calculate_image_quality(self, image: Image.Image) -> float:
        """Calculate a quality score for the image."""
        try:
            # Convert to numpy for analysis
            np_image = np.array(image)
            
            # Calculate variance (higher = more detail)
            variance = np.var(np_image)
            
            # Calculate edge density
            gray = cv2.cvtColor(np_image, cv2.COLOR_RGB2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / edges.size
            
            # Combine metrics
            quality_score = min(1.0, (variance / 10000) * 0.7 + edge_density * 0.3)
            
            return quality_score
        except Exception:
            return 0.5  # Default quality score
    
    def analyze_image_with_best_model(self, image: Image.Image, context: str = "") -> str:
        """Analyze image with the best available model."""
        if not self.available_models:
            # Fallback to basic image analysis
            return self._fallback_image_analysis(image, context)
        
        # Prioritize models by capability
        model_priority = ["claude-3-5-sonnet", "gemini-1.5-pro", "gpt-4-vision-preview"]
        
        for model in model_priority:
            if model in self.available_models:
                try:
                    if model == "claude-3-5-sonnet":
                        return self._analyze_with_claude_sync(image, context)
                    elif model == "gemini-1.5-pro":
                        return self._analyze_with_gemini_sync(image, context)
                    elif model == "gpt-4-vision-preview":
                        return self._analyze_with_gpt4v_sync(image, context)
                except Exception as e:
                    logger.warning(f"Failed to analyze with {model}: {e}")
                    continue
        
        # If all models fail, use fallback analysis
        logger.info("All AI vision models failed, using fallback analysis")
        return self._fallback_image_analysis(image, context)
    
    @rate_limit('gemini')
    def _analyze_with_gemini_sync(self, image: Image.Image, context: str) -> str:
        """Analyze image with Gemini synchronously with rate limiting."""
        try:
            prompt = self._get_analysis_prompt(context, "Gemini")
            response = self.gemini_model.generate_content([prompt, image])
            return response.text.strip() if response.text else "No response from Gemini"
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            raise e
    
    @rate_limit('openai')
    def _analyze_with_gpt4v_sync(self, image: Image.Image, context: str) -> str:
        """Analyze image with GPT-4 Vision synchronously with rate limiting."""
        try:
            # Convert image to base64
            buffer = io.BytesIO()
            image.save(buffer, format='PNG')
            image_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": self._get_analysis_prompt(context, "GPT-4V")},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{image_base64}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1000
            )
            
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"GPT-4V analysis failed: {e}")
            raise e
    
    @rate_limit('claude')
    def _analyze_with_claude_sync(self, image: Image.Image, context: str) -> str:
        """Analyze image with Claude 3.5 Sonnet synchronously with rate limiting."""
        try:
            # Convert image to base64
            buffer = io.BytesIO()
            image.save(buffer, format='PNG')
            image_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            response = self.claude_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/png",
                                    "data": image_base64
                                }
                            },
                            {
                                "type": "text",
                                "text": self._get_analysis_prompt(context, "Claude")
                            }
                        ]
                    }
                ]
            )
            
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude analysis failed: {e}")
            raise e
    
    def _get_analysis_prompt(self, context: str, model_name: str) -> str:
        """Get optimized analysis prompt."""
        return f"""
        Analyze this image from a student submission for grading. Focus on:

        1. **Content Type**: What is shown (diagram, equation, handwritten work, etc.)
        2. **Text Extraction**: Transcribe any visible text, equations, or formulas
        3. **Academic Relevance**: Subject matter and complexity level
        4. **Quality**: Clarity, completeness, presentation (1-10 scale)
        5. **Key Elements**: Important visual components for grading

        Context: {context}

        Provide a concise analysis focusing on grading-relevant information.
        """
    
    def process_submission_images(self, file_path: str, context: str = "") -> Dict[str, Any]:
        """Main method to extract and analyze all images from a submission."""
        try:
            # Extract images
            images = self.extract_images_from_file(file_path)
            
            if not images:
                return {
                    "success": True,
                    "images_found": 0,
                    "analyses": [],
                    "combined_text": "",
                    "summary": "No images found in submission"
                }
            
            # Analyze each image
            analyses = []
            combined_text_parts = []
            
            for i, img_data in enumerate(images):
                try:
                    logger.info(f"Analyzing image {i+1}/{len(images)} from {file_path}")
                    
                    # Add delay between images to avoid overwhelming APIs
                    if i > 0 and self.rate_limit_enabled:
                        logger.info(f"Batch processing delay: {self.batch_delay}s")
                        time.sleep(self.batch_delay)
                    
                    # Analyze with best available model
                    analysis_result = self.analyze_image_with_best_model(
                        img_data['pil_image'], 
                        f"{context} - Image {i+1} from page {img_data['page_number']}"
                    )
                    
                    # Extract text content for integration
                    text_content = self._extract_text_content_from_analysis(analysis_result)
                    if text_content:
                        combined_text_parts.append(f"[Image {i+1} Content: {text_content}]")
                    
                    analyses.append({
                        "image_index": i + 1,
                        "page_number": img_data['page_number'],
                        "dimensions": f"{img_data['width']}x{img_data['height']}",
                        "quality_score": img_data.get('quality_score', 0.5),
                        "analysis": analysis_result
                    })
                    
                except Exception as e:
                    logger.error(f"Error analyzing image {i+1}: {e}")
                    analyses.append({
                        "image_index": i + 1,
                        "page_number": img_data['page_number'],
                        "error": str(e)
                    })
            
            # Combine text for integration into submission
            combined_text = "\n\n".join(combined_text_parts)
            
            return {
                "success": True,
                "images_found": len(images),
                "analyses": analyses,
                "combined_text": combined_text,
                "summary": f"Successfully analyzed {len(images)} images"
            }
            
        except Exception as e:
            logger.error(f"Error processing submission images: {e}")
            return {
                "success": False,
                "error": str(e),
                "images_found": 0,
                "analyses": [],
                "combined_text": "",
                "summary": f"Failed to process images: {str(e)}"
            }
    
    def _fallback_image_analysis(self, image: Image.Image, context: str) -> str:
        """Fallback image analysis without AI models - uses basic computer vision."""
        try:
            import cv2
            import numpy as np
            
            # Convert PIL to OpenCV
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            height, width = cv_image.shape[:2]
            
            # Basic image analysis
            analysis_parts = []
            
            # Basic image properties
            analysis_parts.append(f"**Image Analysis (Computer Vision)**")
            analysis_parts.append(f"- Dimensions: {width}x{height} pixels")
            analysis_parts.append(f"- Aspect ratio: {width/height:.2f}")
            
            # Color analysis
            gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
            mean_brightness = np.mean(gray)
            analysis_parts.append(f"- Average brightness: {mean_brightness:.1f}/255")
            
            # Edge detection for complexity
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / edges.size
            analysis_parts.append(f"- Visual complexity: {edge_density:.3f}")
            
            # Determine likely content type
            if edge_density > 0.05:
                content_type = "complex diagram, chart, or detailed content"
            elif edge_density > 0.02:
                content_type = "moderate complexity content (text, simple diagrams)"
            else:
                content_type = "simple content or mostly blank"
            
            analysis_parts.append(f"- Likely content: {content_type}")
            
            # Basic text detection attempt
            try:
                # Simple text detection using contours
                contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                text_like_contours = [c for c in contours if cv2.contourArea(c) > 50 and cv2.contourArea(c) < 5000]
                
                if len(text_like_contours) > 10:
                    analysis_parts.append("- Possible text content detected")
                elif len(text_like_contours) > 5:
                    analysis_parts.append("- Some text or symbols may be present")
                else:
                    analysis_parts.append("- Primarily graphical content")
                    
            except Exception:
                pass
            
            # Academic relevance assessment
            analysis_parts.append(f"\n**Grading Relevance:**")
            analysis_parts.append(f"- This appears to be academic content based on image characteristics")
            analysis_parts.append(f"- Should be considered for grading as visual element of submission")
            analysis_parts.append(f"- May contain diagrams, equations, handwritten work, or other academic content")
            
            if "math" in context.lower() or "equation" in context.lower():
                analysis_parts.append("- Context suggests mathematical content - likely equations or formulas")
            elif "diagram" in context.lower() or "chart" in context.lower():
                analysis_parts.append("- Context suggests graphical content - likely diagrams or charts")
            
            return "\n".join(analysis_parts)
            
        except Exception as e:
            return f"Basic image analysis - academic content detected ({width}x{height} pixels). Manual review recommended for grading."
    
    def _extract_text_content_from_analysis(self, analysis: str) -> str:
        """Extract relevant text content from AI analysis."""
        try:
            # Look for transcribed text, equations, formulas
            import re
            
            # Extract content within quotes (likely transcribed text)
            quoted_text = re.findall(r'"([^"]*)"', analysis)
            
            # Extract mathematical expressions
            math_expressions = re.findall(r'[=<>≤≥∑∫∂√±×÷].*?[a-zA-Z0-9]', analysis)
            
            # Combine relevant content
            relevant_content = []
            relevant_content.extend(quoted_text)
            relevant_content.extend(math_expressions)
            
            return " | ".join(relevant_content) if relevant_content else ""
            
        except Exception:
            return ""


# Integration function for the multiagent system
def enhance_submission_with_images(submission_text: str, file_path: str, context: str = "") -> str:
    """
    Enhance submission text by extracting and analyzing images.
    
    This function integrates with the multiagent grading system.
    """
    try:
        enhancer = EnhancedImageExtractionService()
        
        if not enhancer.available_models:
            logger.warning("No AI vision models available for image enhancement")
            return submission_text
        
        # Process images
        result = enhancer.process_submission_images(file_path, context)
        
        if result["success"] and result["images_found"] > 0:
            # Integrate image analysis into submission
            enhanced_text = submission_text
            
            if result["combined_text"]:
                enhanced_text += f"\n\n=== EXTRACTED IMAGE CONTENT ===\n{result['combined_text']}"
            
            # Add concise summary
            enhanced_text += f"\n\n=== VISUAL ELEMENTS SUMMARY ===\n"
            enhanced_text += f"This submission contains {result['images_found']} images with academic content.\n"
            
            for analysis in result["analyses"]:
                if "analysis" in analysis:
                    # Extract key points for grading
                    key_points = analysis['analysis'][:300] + "..." if len(analysis['analysis']) > 300 else analysis['analysis']
                    enhanced_text += f"\nImage {analysis['image_index']}: {key_points}\n"
            
            logger.info(f"Enhanced submission with {result['images_found']} image analyses")
            return enhanced_text
        else:
            return submission_text
            
    except Exception as e:
        logger.error(f"Error enhancing submission with images: {e}")
        return submission_text 