#!/usr/bin/env python3
"""
Minimal extraction service for demonstrating OCR data organization.
This version only includes working OCR engines to avoid dependency conflicts.
"""

import os
import tempfile
import cv2
import numpy as np
import logging
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create OCR data storage directories
OCR_DATA_DIR = Path("data/ocr_extractions")
OCR_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Create subdirectories for organized storage
(OCR_DATA_DIR / "images").mkdir(exist_ok=True)
(OCR_DATA_DIR / "extracted_text").mkdir(exist_ok=True)
(OCR_DATA_DIR / "preprocessed_images").mkdir(exist_ok=True)
(OCR_DATA_DIR / "metadata").mkdir(exist_ok=True)

# Tesseract imports
try:
    import pytesseract
    import PIL.Image
    tesseract_available = True
    logger.info("Tesseract OCR is available")
except ImportError:
    logger.warning("pytesseract package not installed. Tesseract will not be available.")
    tesseract_available = False

def save_extraction_data(file_path: str, images: List[np.ndarray], preprocessed_images: List[np.ndarray], 
                        extracted_text: str, ocr_engine: str, metadata: dict = None) -> str:
    """
    Save images, preprocessed images, extracted text, and metadata for analysis.
    
    Args:
        file_path: Original file path
        images: List of original images
        preprocessed_images: List of preprocessed images
        extracted_text: Extracted text content
        ocr_engine: OCR engine used
        metadata: Additional metadata
        
    Returns:
        Session ID for the saved data
    """
    try:
        # Create unique session ID
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_name = Path(file_path).stem
        session_id = f"{file_name}_{timestamp}_{ocr_engine}"
        
        # Create session directory
        session_dir = OCR_DATA_DIR / session_id
        session_dir.mkdir(exist_ok=True)
        
        # Save original images
        images_dir = session_dir / "original_images"
        images_dir.mkdir(exist_ok=True)
        
        for i, image in enumerate(images):
            image_path = images_dir / f"page_{i+1}.png"
            cv2.imwrite(str(image_path), image)
        
        # Save preprocessed images
        preprocessed_dir = session_dir / "preprocessed_images"
        preprocessed_dir.mkdir(exist_ok=True)
        
        for i, image in enumerate(preprocessed_images):
            image_path = preprocessed_dir / f"page_{i+1}_processed.png"
            cv2.imwrite(str(image_path), image)
        
        # Save extracted text
        text_file = session_dir / "extracted_text.txt"
        with open(text_file, 'w', encoding='utf-8') as f:
            f.write(extracted_text)
        
        # Save metadata
        metadata_info = {
            "session_id": session_id,
            "original_file": file_path,
            "ocr_engine": ocr_engine,
            "timestamp": timestamp,
            "num_pages": len(images),
            "text_length": len(extracted_text),
            "custom_metadata": metadata or {}
        }
        
        metadata_file = session_dir / "metadata.json"
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata_info, f, indent=2)
        
        logger.info(f"Saved extraction data to session: {session_id}")
        return session_id
        
    except Exception as e:
        logger.error(f"Failed to save extraction data: {e}")
        return ""

def preprocess_image(image: np.ndarray) -> np.ndarray:
    """
    Preprocess an image to improve OCR quality.
    
    Args:
        image: Input image as a numpy array
        
    Returns:
        Processed image as a numpy array
    """
    # Convert to grayscale if it's not already
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    # Apply threshold to get black and white image
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Denoise image
    try:
        denoised = cv2.fastNlMeansDenoising(binary, None, 10, 7, 21)
    except Exception as e:
        logger.warning(f"Denoising failed, using original binary image: {e}")
        denoised = binary
    
    # Detect and correct skew if necessary
    try:
        coords = np.column_stack(np.where(denoised > 0))
        angle = cv2.minAreaRect(coords)[-1]
        
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
            
        # Only correct if skew is significant
        if abs(angle) > 0.5:
            (h, w) = denoised.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            denoised = cv2.warpAffine(denoised, M, (w, h), 
                                     flags=cv2.INTER_CUBIC, 
                                     borderMode=cv2.BORDER_REPLICATE)
    except Exception as e:
        logger.warning(f"Skew correction failed: {e}")
    
    return denoised

def convert_pdf_to_images(pdf_path: str, dpi: int = 300) -> List[np.ndarray]:
    """
    Convert PDF pages to images for preprocessing.
    
    Args:
        pdf_path: Path to the PDF file
        dpi: Resolution for rendering (higher = better quality but slower)
        
    Returns:
        List of images as numpy arrays, one per page
    """
    try:
        # Try using pypdfium2 first
        try:
            import pypdfium2 as pdfium
            pdf = pdfium.PdfDocument(pdf_path)
            images = []
            
            for i in range(len(pdf)):
                page = pdf[i]
                # Render at high DPI for better OCR
                bitmap = page.render(scale=dpi/72)
                pil_image = bitmap.to_pil()
                # Convert PIL to OpenCV format
                image = np.array(pil_image)
                if len(image.shape) == 3 and image.shape[2] == 4:  # RGBA
                    image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
                images.append(image)
            
            return images
        except ImportError:
            # Fall back to pdf2image if pypdfium2 is not available
            import pdf2image
            images = pdf2image.convert_from_path(pdf_path, dpi=dpi)
            return [np.array(img) for img in images]
    except Exception as e:
        logger.error(f"Error converting PDF to images: {e}")
        return []

def extract_with_tesseract(file_path: str, save_data: bool = True) -> str:
    """
    Extract text using Tesseract OCR.
    
    Args:
        file_path: Path to the document
        save_data: Whether to save extraction data for analysis
        
    Returns:
        Extracted text as a string
    """
    if not tesseract_available:
        logger.error("Tesseract is not available")
        return ""
    
    try:
        logger.info("Using Tesseract OCR for extraction")
        
        # For PDFs, we need to convert to images first
        if file_path.lower().endswith('.pdf'):
            images = convert_pdf_to_images(file_path)
            if not images:
                logger.error("Failed to extract images from PDF")
                return ""
                
            results = []
            preprocessed_images = []
            
            for image in images:
                # Preprocess image
                processed_img = preprocess_image(image)
                preprocessed_images.append(processed_img)
                
                # Convert to PIL Image for Tesseract
                pil_image = PIL.Image.fromarray(processed_img)
                
                # Run OCR
                page_text = pytesseract.image_to_string(pil_image, lang='eng')
                results.append(page_text)
            
            extracted_text = "\n\n".join(results)
            
            # Save extraction data if requested
            if save_data:
                save_extraction_data(file_path, images, preprocessed_images, extracted_text, "tesseract")
            
            return extracted_text
        else:
            # For single images
            try:
                original_img = cv2.imread(file_path)
                processed_img = preprocess_image(original_img)
                pil_image = PIL.Image.fromarray(processed_img)
                extracted_text = pytesseract.image_to_string(pil_image, lang='eng')
                
                # Save extraction data if requested
                if save_data:
                    save_extraction_data(file_path, [original_img], [processed_img], extracted_text, "tesseract")
                
                return extracted_text
            except Exception as e:
                logger.error(f"Tesseract image processing failed: {e}")
                # Try direct processing without preprocessing
                extracted_text = pytesseract.image_to_string(PIL.Image.open(file_path), lang='eng')
                
                # Save basic extraction data if requested
                if save_data:
                    original_img = cv2.imread(file_path)
                    save_extraction_data(file_path, [original_img], [original_img], extracted_text, "tesseract")
                
                return extracted_text
    except Exception as e:
        logger.error(f"Tesseract OCR extraction failed: {e}")
        return ""

if __name__ == "__main__":
    # Simple test
    test_file = "test_files/huynhroger_4489590_79107742_CMPE-148_ Networking Homework .pdf"
    
    if os.path.exists(test_file):
        print("🔍 Testing Minimal OCR Data Organization")
        print("=" * 50)
        
        result = extract_with_tesseract(test_file, save_data=True)
        
        if result:
            print("✅ Tesseract OCR - Data saved successfully")
            print(f"📄 Extracted {len(result)} characters of text")
            print(f"📁 Data saved to: {OCR_DATA_DIR}")
        else:
            print("❌ Tesseract OCR - Failed")
    else:
        print(f"Test file not found: {test_file}") 