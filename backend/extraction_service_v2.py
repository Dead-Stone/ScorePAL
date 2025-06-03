# extraction_service.py
import zipfile
import os
import tempfile
import cv2
import numpy as np
import logging
import subprocess
from typing import Dict, List, Optional, Tuple, Union
from dotenv import load_dotenv

load_dotenv()
OCR_ENGINE = os.getenv("OCR_ENGINE", "opensource").lower()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# UnstructuredIO import
try:
    from unstructured.partition.pdf import partition_pdf
    unstructured_available = True
except ImportError:
    logger.warning("unstructured package not installed. UnstructuredIO will not be available.")
    unstructured_available = False

# PaddleOCR imports
try:
    from paddleocr import PaddleOCR
    paddle_ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
    paddle_available = True
except ImportError:
    logger.warning("paddleocr package not installed. PaddleOCR will not be available.")
    paddle_available = False

# Tesseract imports
try:
    import pytesseract
    import PIL.Image
    tesseract_available = True
except ImportError:
    logger.warning("pytesseract package not installed. Tesseract will not be available.")
    tesseract_available = False

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

def extract_with_unstructured(file_path: str) -> str:
    """
    Extract text using UnstructuredIO.
    
    Args:
        file_path: Path to the document
        
    Returns:
        Extracted text as a string
    """
    if not unstructured_available:
        logger.error("UnstructuredIO is not available")
        return ""
        
    try:
        logger.info("Using UnstructuredIO for extraction")
        elements = partition_pdf(file_path, strategy="hi_res")
        return "\n".join(el.text for el in elements if hasattr(el, "text") and el.text)
    except Exception as e:
        logger.error(f"UnstructuredIO extraction failed: {e}")
        return ""

def extract_with_tesseract(file_path: str) -> str:
    """
    Extract text using Tesseract OCR.
    
    Args:
        file_path: Path to the document
        
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
            
            for image in images:
                # Preprocess image
                processed_img = preprocess_image(image)
                
                # Convert to PIL Image for Tesseract
                pil_image = PIL.Image.fromarray(processed_img)
                
                # Run OCR
                page_text = pytesseract.image_to_string(pil_image, lang='eng')
                results.append(page_text)
            
            return "\n\n".join(results)
        else:
            # For single images
            try:
                processed_img = preprocess_image(cv2.imread(file_path))
                pil_image = PIL.Image.fromarray(processed_img)
                return pytesseract.image_to_string(pil_image, lang='eng')
            except Exception as e:
                logger.error(f"Tesseract image processing failed: {e}")
                # Try direct processing without preprocessing
                return pytesseract.image_to_string(PIL.Image.open(file_path), lang='eng')
    except Exception as e:
        logger.error(f"Tesseract OCR extraction failed: {e}")
        return ""

def extract_with_paddleocr(file_path: str) -> str:
    """
    Extract text using PaddleOCR.
    
    Args:
        file_path: Path to the document
        
    Returns:
        Extracted text as a string
    """
    if not paddle_available:
        logger.error("PaddleOCR is not available")
        return ""
    
    try:
        logger.info("Using PaddleOCR for extraction")
        
        # For PDFs, we need to convert to images first
        if file_path.lower().endswith('.pdf'):
            images = convert_pdf_to_images(file_path)
            results = []
            
            for image in images:
                # Preprocess image
                processed_img = preprocess_image(image)
                
                # Save to temp file for PaddleOCR
                temp_img_path = tempfile.mktemp(suffix='.jpg')
                cv2.imwrite(temp_img_path, processed_img)
                
                # Run OCR
                result = paddle_ocr.ocr(temp_img_path, cls=True)
                
                # Extract text from result
                page_text = []
                if result[0]:  # Check if result is not empty
                    for line in result[0]:  # First element contains OCR results
                        if line and len(line) > 1 and len(line[1]) > 0:
                            text = line[1][0]  # Extract text from detection
                            confidence = line[1][1]  # Extract confidence
                            if confidence > 0.5:  # Include medium-confidence results
                                page_text.append(text)
                
                results.append("\n".join(page_text))
                
                # Clean up temp file
                try:
                    os.remove(temp_img_path)
                except:
                    pass
            
            return "\n\n".join(results)
        else:
            # For single images
            try:
                processed_img = preprocess_image(cv2.imread(file_path))
                temp_img_path = tempfile.mktemp(suffix='.jpg')
                cv2.imwrite(temp_img_path, processed_img)
                
                result = paddle_ocr.ocr(temp_img_path, cls=True)
                
                texts = []
                if result[0]:  # Check if result is not empty
                    for line in result[0]:  # First element contains OCR results
                        if line and len(line) > 1 and len(line[1]) > 0:
                            text = line[1][0]  # Extract text from detection
                            confidence = line[1][1]  # Extract confidence
                            if confidence > 0.5:  # Include medium-confidence results
                                texts.append(text)
                
                try:
                    os.remove(temp_img_path)
                except:
                    pass
                
                return "\n".join(texts)
            except Exception as e:
                logger.error(f"PaddleOCR image processing failed, trying direct processing: {e}")
                # Try direct processing without preprocessing
                result = paddle_ocr.ocr(file_path, cls=True)
                
                texts = []
                if result[0]:  # Check if result is not empty
                    for line in result[0]:  # First element contains OCR results
                        if line and len(line) > 1 and len(line[1]) > 0:
                            text = line[1][0]  # Extract text from detection
                            confidence = line[1][1]  # Extract confidence
                            if confidence > 0.5:  # Include medium-confidence results
                                texts.append(text)
                
                return "\n".join(texts)
    except Exception as e:
        logger.error(f"PaddleOCR extraction failed: {e}")
        return ""

def detect_document_type(file_path: str) -> str:
    """
    Simple heuristic to detect document type based on first page analysis.
    
    Args:
        file_path: Path to the document
        
    Returns:
        Document type as string: "table_heavy", "academic", "multi_column", or "general"
    """
    try:
        if file_path.lower().endswith('.pdf'):
            images = convert_pdf_to_images(file_path)
            if not images:
                return "general"
            first_page = images[0]
        else:
            first_page = cv2.imread(file_path)
            if first_page is None:
                logger.error(f"Could not read image: {file_path}")
                return "general"
        
        # Convert to grayscale
        gray = cv2.cvtColor(first_page, cv2.COLOR_BGR2GRAY) if len(first_page.shape) == 3 else first_page
        
        # Detect horizontal and vertical lines (potential table indicators)
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
        
        # Horizontal lines
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 1))
        horizontal_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
        
        # Vertical lines
        vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 25))
        vertical_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
        
        # Count lines
        h_lines = cv2.HoughLinesP(horizontal_lines, 1, np.pi/180, threshold=100, minLineLength=100, maxLineGap=10)
        v_lines = cv2.HoughLinesP(vertical_lines, 1, np.pi/180, threshold=100, minLineLength=100, maxLineGap=10)
        
        h_count = 0 if h_lines is None else len(h_lines)
        v_count = 0 if v_lines is None else len(v_lines)
        
        # Check for tables based on line count
        table_indicator = (h_count > 5 and v_count > 5)
        
        # Check for multiple columns (vertical lines with similar x-coordinates)
        col_indicator = False
        if v_lines is not None and len(v_lines) > 10:
            x_coords = [line[0][0] for line in v_lines]
            x_coords.sort()
            
            # Check if there are clusters of x-coordinates
            col_count = 1
            for i in range(1, len(x_coords)):
                if x_coords[i] - x_coords[i-1] > 50:  # Gap between columns
                    col_count += 1
            
            col_indicator = col_count >= 2
        
        # Check for academic/scientific documents (look for equation-like patterns)
        # This is a simple heuristic - equations often have special characters
        # Fix for OpenCV 4.x compatibility
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        small_isolated_contours = 0
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if 5 < w < 30 and 5 < h < 30:  # Small isolated symbols, potential equation components
                small_isolated_contours += 1
        
        academic_indicator = small_isolated_contours > 100
        
        # Determine document type
        if table_indicator:
            return "table_heavy"
        elif academic_indicator:
            return "academic"
        elif col_indicator:
            return "multi_column"
        else:
            return "general"
    except Exception as e:
        logger.error(f"Document type detection failed: {e}")
        return "general"  # Default to general type

def extract_pdf_text_opensource(file_path: str) -> str:
    """
    Use an open-source approach with multiple OCR engines for optimal accuracy.
    
    Args:
        file_path: Path to the document
        
    Returns:
        Extracted text as a string
    """
    doc_type = detect_document_type(file_path)
    logger.info(f"Detected document type: {doc_type}")
    
    results = {}
    
    # Try PaddleOCR first (best for tables and complex layouts)
    if paddle_available:
        try:
            results["paddle"] = extract_with_paddleocr(file_path)
        except Exception as e:
            logger.warning(f"PaddleOCR failed: {e}")
    
    # Try Tesseract (good for clean text)
    if tesseract_available and (doc_type == "general" or not results or len(results.get("paddle", "")) < 100):
        try:
            results["tesseract"] = extract_with_tesseract(file_path)
        except Exception as e:
            logger.warning(f"Tesseract failed: {e}")
    
    # Try UnstructuredIO (fallback)
    if unstructured_available and not results:
        try:
            results["unstructured"] = extract_with_unstructured(file_path)
        except Exception as e:
            logger.warning(f"UnstructuredIO failed: {e}")
    
    # Select the best result based on document type
    if not results:
        logger.error("All OCR methods failed")
        return ""
    
    # Prioritize based on document type
    if doc_type == "table_heavy" and "paddle" in results and len(results["paddle"]) > 100:
        best_result = results["paddle"]
    elif doc_type == "general" and "tesseract" in results and len(results["tesseract"]) > 100:
        best_result = results["tesseract"]
    elif "paddle" in results and len(results["paddle"]) > 100:
        best_result = results["paddle"]
    elif "tesseract" in results and len(results["tesseract"]) > 100:
        best_result = results["tesseract"]
    elif "unstructured" in results:
        best_result = results["unstructured"]
    else:
        # Take the longest result (heuristic for most content extracted)
        best_result = max(results.values(), key=len) if results else ""
    
    return best_result

def extract_pdf_text(file_path: str) -> str:
    """
    Extract text from a PDF file using the configured OCR engine.
    
    Args:
        file_path: Path to the PDF file
        
    Returns:
        Extracted text as a string
    """
    # Only use open source methods now for reliability
    try:
        return extract_pdf_text_opensource(file_path)
    except Exception as e:
        logger.error(f"All extraction methods failed: {e}")
        # Last-resort attempt with each method directly
        if paddle_available:
            try:
                return extract_with_paddleocr(file_path)
            except:
                pass
        if tesseract_available:
            try:
                return extract_with_tesseract(file_path)
            except:
                pass
        if unstructured_available:
            try:
                return extract_with_unstructured(file_path)
            except:
                pass
        return ""  # Return empty string if all methods fail

def extract_submissions(zip_file_path: str) -> dict[str, str]:
    """
    Extract text from all documents in a zip file.
    
    Args:
        zip_file_path: Path to the zip file containing documents
        
    Returns:
        Dictionary mapping student names to extracted text
    """
    submissions = {}
    try:
        with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
            temp_dir = tempfile.mkdtemp()
            logger.info(f"Extracting submissions to: {temp_dir}")
            zip_ref.extractall(temp_dir)
            
            # Count files for logging
            all_files = []
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    all_files.append(os.path.join(root, file))
            
            logger.info(f"Found {len(all_files)} files in the zip archive")
            
            # Process files
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    student_name = os.path.splitext(file)[0]
                    file_path = os.path.join(root, file)
                    logger.info(f"Processing submission: {file} from student: {student_name}")

                    if file.lower().endswith('.pdf'):
                        try:
                            text = extract_pdf_text(file_path)
                            submissions[student_name] = text
                            logger.info(f"Successfully extracted {len(text)} characters from {file}")
                        except Exception as e:
                            logger.error(f"Error extracting text from {file}: {e}")
                            submissions[student_name] = ""
                    elif file.lower().endswith(('.txt', '.md')):
                        try:
                            with open(file_path, 'r', encoding="utf-8") as f:
                                text = f.read()
                                submissions[student_name] = text
                                logger.info(f"Successfully read {len(text)} characters from {file}")
                        except UnicodeDecodeError:
                            # Try with different encodings
                            try:
                                with open(file_path, 'r', encoding="latin-1") as f:
                                    text = f.read()
                                    submissions[student_name] = text
                                    logger.info(f"Successfully read {len(text)} characters from {file} using latin-1 encoding")
                            except Exception as e:
                                logger.error(f"Error reading {file}: {e}")
                                submissions[student_name] = ""
                        except Exception as e:
                            logger.error(f"Error reading {file}: {e}")
                            submissions[student_name] = ""
                    elif file.lower().endswith(('.jpg', '.jpeg', '.png')):
                        try:
                            # Process image files using the same OCR pipeline
                            text = extract_pdf_text(file_path)
                            submissions[student_name] = text
                            logger.info(f"Successfully extracted {len(text)} characters from image {file}")
                        except Exception as e:
                            logger.error(f"Error extracting text from image {file}: {e}")
                            submissions[student_name] = ""
            
            # Clean up
            try:
                import shutil
                shutil.rmtree(temp_dir)
            except:
                logger.warning(f"Could not clean up temp directory: {temp_dir}")
                
    except zipfile.BadZipFile:
        logger.error(f"The file is not a valid ZIP file: {zip_file_path}")
    except Exception as e:
        logger.error(f"Error processing ZIP file: {e}")
    
    logger.info(f"Processed {len(submissions)} submissions")
    return submissions
