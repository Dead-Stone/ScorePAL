"""
OCR Configuration and Settings
Centralized configuration for all OCR engines and processing parameters.
"""

import os
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

class OCRConfig:
    """Configuration class for OCR settings."""
    
    # Engine priorities by document type
    ENGINE_PRIORITIES = {
        "table_heavy": ["paddleocr", "easyocr", "tesseract", "unstructured"],
        "academic": ["easyocr", "paddleocr", "tesseract", "unstructured"],
        "multi_column": ["paddleocr", "easyocr", "tesseract", "unstructured"],
        "general": ["tesseract", "easyocr", "paddleocr", "unstructured"],
        "handwritten": ["easyocr", "paddleocr", "tesseract", "unstructured"]
    }
    
    # OCR Engine Settings
    TESSERACT_CONFIG = {
        "lang": "eng",
        "config": "--oem 3 --psm 6"  # OCR Engine Mode 3, Page Segmentation Mode 6
    }
    
    PADDLEOCR_CONFIG = {
        "use_angle_cls": True,
        "lang": "en",
        "show_log": False,
        "use_gpu": False  # Set to True if GPU available
    }
    
    EASYOCR_CONFIG = {
        "languages": ["en"],
        "gpu": False,  # Set to True if GPU available
        "width_ths": 0.7,
        "height_ths": 0.7
    }
    
    # Image Processing Settings
    IMAGE_PROCESSING = {
        "dpi": int(os.getenv("OCR_DPI", "300")),  # Higher DPI = better quality, slower processing
        "denoise_strength": 10,
        "skew_correction_threshold": 0.5,  # degrees
        "confidence_threshold": 0.5
    }
    
    # Performance Settings
    PERFORMANCE = {
        "max_workers": int(os.getenv("OCR_MAX_WORKERS", "4")),
        "timeout_seconds": int(os.getenv("OCR_TIMEOUT", "300")),
        "memory_limit_mb": int(os.getenv("OCR_MEMORY_LIMIT", "2048"))
    }
    
    # Quality Settings
    QUALITY = {
        "min_text_length": 10,  # Minimum characters to consider extraction successful
        "enable_preprocessing": True,
        "enable_postprocessing": True,
        "save_intermediate_files": os.getenv("SAVE_OCR_FILES", "false").lower() == "true"
    }
    
    @classmethod
    def get_engine_priority(cls, doc_type: str) -> List[str]:
        """Get the priority order of OCR engines for a document type."""
        return cls.ENGINE_PRIORITIES.get(doc_type, cls.ENGINE_PRIORITIES["general"])
    
    @classmethod
    def get_tesseract_config(cls) -> Dict:
        """Get Tesseract configuration."""
        return cls.TESSERACT_CONFIG.copy()
    
    @classmethod
    def get_paddleocr_config(cls) -> Dict:
        """Get PaddleOCR configuration."""
        return cls.PADDLEOCR_CONFIG.copy()
    
    @classmethod
    def get_easyocr_config(cls) -> Dict:
        """Get EasyOCR configuration."""
        return cls.EASYOCR_CONFIG.copy()
    
    @classmethod
    def get_image_processing_config(cls) -> Dict:
        """Get image processing configuration."""
        return cls.IMAGE_PROCESSING.copy()
    
    @classmethod
    def should_save_intermediate_files(cls) -> bool:
        """Check if intermediate files should be saved."""
        return cls.QUALITY["save_intermediate_files"] 