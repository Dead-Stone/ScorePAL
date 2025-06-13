#!/usr/bin/env python3
"""
Image Extraction Service for ScorePAL
Extracts images from PDF/DOC submissions and generates AI summaries using Gemini.
"""

import os
import io
import base64
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple, Union
import cv2
import numpy as np
from PIL import Image
import fitz  # PyMuPDF
import google.generativeai as genai
from docx import Document

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create image extraction data storage directories
IMAGE_EXTRACTION_DIR = Path("data/image_extractions")
IMAGE_EXTRACTION_DIR.mkdir(parents=True, exist_ok=True)

class ImageExtractionService:
    """Service for extracting images from documents and generating AI summaries."""
    
    def __init__(self, gemini_api_key: str = None):
        """Initialize the image extraction service."""
        self.gemini_api_key = gemini_api_key or os.getenv("GEMINI_API_KEY")
        
        if self.gemini_api_key:
            genai.configure(api_key=self.gemini_api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
            logger.info("Gemini AI configured successfully")
        else:
            self.model = None
            logger.warning("Gemini API key not provided. AI summaries will not be available.")
    
    def extract_images_from_pdf(self, pdf_path: str) -> List[Dict]:
        """Extract images from a PDF file."""
        images = []
        
        try:
            pdf_document = fitz.open(pdf_path)
            
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                image_list = page.get_images(full=True)
                
                for img_index, img in enumerate(image_list):
                    xref = img[0]
                    pix = fitz.Pixmap(pdf_document, xref)
                    
                    if pix.n - pix.alpha < 4:  # GRAY or RGB
                        img_data = pix.tobytes("png")
                        pil_image = Image.open(io.BytesIO(img_data))
                        cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
                        
                        height, width = cv_image.shape[:2]
                        
                        # Only include reasonably sized images
                        if width >= 50 and height >= 50:
                            images.append({
                                'image': cv_image,
                                'pil_image': pil_image,
                                'page_number': page_num + 1,
                                'image_index': img_index + 1,
                                'width': width,
                                'height': height,
                                'format': 'PNG',
                                'source_type': 'pdf'
                            })
                    
                    pix = None
            
            pdf_document.close()
            logger.info(f"Extracted {len(images)} images from PDF: {pdf_path}")
            
        except Exception as e:
            logger.error(f"Error extracting images from PDF {pdf_path}: {e}")
        
        return images
    
    def extract_images_from_docx(self, docx_path: str) -> List[Dict]:
        """Extract images from a DOCX file."""
        images = []
        
        try:
            doc = Document(docx_path)
            
            for rel in doc.part.rels.values():
                if "image" in rel.target_ref:
                    try:
                        image_data = rel.target_part.blob
                        pil_image = Image.open(io.BytesIO(image_data))
                        cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
                        
                        height, width = cv_image.shape[:2]
                        
                        if width >= 50 and height >= 50:
                            images.append({
                                'image': cv_image,
                                'pil_image': pil_image,
                                'page_number': 1,
                                'image_index': len(images) + 1,
                                'width': width,
                                'height': height,
                                'format': pil_image.format or 'Unknown',
                                'source_type': 'docx'
                            })
                    
                    except Exception as e:
                        logger.warning(f"Could not process image in DOCX: {e}")
                        continue
            
            logger.info(f"Extracted {len(images)} images from DOCX: {docx_path}")
            
        except Exception as e:
            logger.error(f"Error extracting images from DOCX {docx_path}: {e}")
        
        return images
    
    def generate_image_summary(self, pil_image: Image.Image, context: str = "") -> str:
        """Generate an AI summary of an image using Gemini."""
        if not self.model:
            return "AI summary not available (Gemini API key not configured)"
        
        try:
            prompt = f"""
            Analyze this image from a student submission for grading purposes. Provide a detailed summary that includes:

            1. **Content Type**: What type of content is shown (diagram, chart, graph, handwritten work, screenshot, etc.)
            2. **Subject Matter**: What academic subject or topic does this relate to
            3. **Key Elements**: Describe the main visual elements, text, symbols, or data shown
            4. **Quality Assessment**: Comment on the clarity, completeness, and presentation quality
            5. **Grading Relevance**: How this image might be relevant for academic assessment

            Context: {context}

            Please be thorough but concise, focusing on elements that would be important for an instructor grading this submission.
            """
            
            response = self.model.generate_content([prompt, pil_image])
            
            if response.text:
                return response.text.strip()
            else:
                return "Could not generate summary - no response from AI model"
                
        except Exception as e:
            logger.error(f"Error generating image summary: {e}")
            return f"Error generating summary: {str(e)}"
    
    def save_extraction_session(self, file_path: str, images: List[Dict], summaries: List[str]) -> str:
        """Save extracted images and their summaries to organized folders."""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_name = Path(file_path).stem
            session_id = f"{file_name}_{timestamp}_images"
            
            session_dir = IMAGE_EXTRACTION_DIR / session_id
            session_dir.mkdir(exist_ok=True)
            
            images_dir = session_dir / "images"
            images_dir.mkdir(exist_ok=True)
            
            saved_images = []
            
            for i, (img_data, summary) in enumerate(zip(images, summaries)):
                image_filename = f"image_{i+1}_page_{img_data['page_number']}.png"
                image_path = images_dir / image_filename
                cv2.imwrite(str(image_path), img_data['image'])
                
                image_info = {
                    'filename': image_filename,
                    'page_number': img_data['page_number'],
                    'image_index': img_data['image_index'],
                    'width': img_data['width'],
                    'height': img_data['height'],
                    'format': img_data['format'],
                    'source_type': img_data['source_type'],
                    'file_size': image_path.stat().st_size,
                    'summary': summary
                }
                saved_images.append(image_info)
            
            summaries_dir = session_dir / "summaries"
            summaries_dir.mkdir(exist_ok=True)
            
            for i, summary in enumerate(summaries):
                summary_filename = f"image_{i+1}_summary.txt"
                summary_path = summaries_dir / summary_filename
                with open(summary_path, 'w', encoding='utf-8') as f:
                    f.write(summary)
            
            metadata = {
                'session_id': session_id,
                'original_file': file_path,
                'timestamp': timestamp,
                'total_images': len(images),
                'images': saved_images,
                'extraction_summary': {
                    'total_images_found': len(images),
                    'average_image_size': {
                        'width': sum(img['width'] for img in saved_images) / len(saved_images) if saved_images else 0,
                        'height': sum(img['height'] for img in saved_images) / len(saved_images) if saved_images else 0
                    },
                    'source_types': list(set(img['source_type'] for img in saved_images)),
                    'total_file_size': sum(img['file_size'] for img in saved_images)
                }
            }
            
            metadata_file = session_dir / "metadata.json"
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2)
            
            report_file = session_dir / "extraction_report.txt"
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(f"IMAGE EXTRACTION REPORT\n")
                f.write(f"=" * 50 + "\n\n")
                f.write(f"Source File: {file_path}\n")
                f.write(f"Extraction Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Total Images Extracted: {len(images)}\n\n")
                
                for i, (img_info, summary) in enumerate(zip(saved_images, summaries)):
                    f.write(f"IMAGE {i+1}\n")
                    f.write(f"-" * 20 + "\n")
                    f.write(f"File: {img_info['filename']}\n")
                    f.write(f"Page: {img_info['page_number']}\n")
                    f.write(f"Size: {img_info['width']}x{img_info['height']} pixels\n")
                    f.write(f"Format: {img_info['format']}\n\n")
                    f.write(f"AI SUMMARY:\n{summary}\n\n")
                    f.write(f"{'='*50}\n\n")
            
            logger.info(f"Saved image extraction session: {session_id}")
            return session_id
            
        except Exception as e:
            logger.error(f"Failed to save extraction session: {e}")
            return ""
    
    def extract_and_analyze_images(self, file_path: str, context: str = "") -> Dict:
        """Main method to extract images from a document and generate AI summaries."""
        if not os.path.exists(file_path):
            return {'error': f'File not found: {file_path}'}
        
        file_ext = Path(file_path).suffix.lower()
        
        if file_ext == '.pdf':
            images = self.extract_images_from_pdf(file_path)
        elif file_ext in ['.docx', '.doc']:
            if file_ext == '.doc':
                return {'error': 'DOC files not supported. Please convert to DOCX.'}
            images = self.extract_images_from_docx(file_path)
        else:
            return {'error': f'Unsupported file type: {file_ext}'}
        
        if not images:
            return {
                'message': 'No images found in the document',
                'total_images': 0,
                'session_id': None
            }
        
        summaries = []
        for i, img_data in enumerate(images):
            logger.info(f"Generating summary for image {i+1}/{len(images)}")
            summary = self.generate_image_summary(
                img_data['pil_image'], 
                context or f"Image {i+1} from {Path(file_path).name}"
            )
            summaries.append(summary)
        
        session_id = self.save_extraction_session(file_path, images, summaries)
        
        return {
            'success': True,
            'total_images': len(images),
            'session_id': session_id,
            'images': [
                {
                    'page_number': img['page_number'],
                    'image_index': img['image_index'],
                    'width': img['width'],
                    'height': img['height'],
                    'format': img['format'],
                    'summary': summary
                }
                for img, summary in zip(images, summaries)
            ],
            'extraction_location': str(IMAGE_EXTRACTION_DIR / session_id) if session_id else None
        }

def main():
    """Test the image extraction service."""
    test_file = "test_files/huynhroger_4489590_79107742_CMPE-148_ Networking Homework .pdf"
    
    if not os.path.exists(test_file):
        print(f"Test file not found: {test_file}")
        return
    
    print("🖼️ Testing Image Extraction Service")
    print("=" * 50)
    
    service = ImageExtractionService()
    
    result = service.extract_and_analyze_images(
        test_file, 
        context="Networking homework submission for grading"
    )
    
    if result.get('error'):
        print(f"❌ Error: {result['error']}")
        return
    
    if result.get('success'):
        print(f"✅ Successfully extracted {result['total_images']} images")
        print(f"📁 Session ID: {result['session_id']}")
        print(f"📂 Location: {result['extraction_location']}")
        
        print(f"\n📋 Image Details:")
        for i, img in enumerate(result['images']):
            print(f"\n🖼️ Image {i+1}:")
            print(f"   📄 Page: {img['page_number']}")
            print(f"   📏 Size: {img['width']}x{img['height']} pixels")
            print(f"   🎨 Format: {img['format']}")
            print(f"   📝 Summary: {img['summary'][:100]}...")
    else:
        print(f"ℹ️ {result.get('message', 'No images found')}")

if __name__ == "__main__":
    main() 