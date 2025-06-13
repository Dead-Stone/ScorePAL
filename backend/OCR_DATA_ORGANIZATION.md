# OCR Data Organization System

This document explains the OCR data organization system that automatically saves images and extracted text data for better understanding and debugging of OCR processes.

## 📁 Directory Structure

The OCR system automatically creates the following directory structure:

```
backend/data/ocr_extractions/
├── [filename]_[timestamp]_[engine]/
│   ├── original_images/
│   │   ├── page_1.png
│   │   ├── page_2.png
│   │   └── ...
│   ├── preprocessed_images/
│   │   ├── page_1_processed.png
│   │   ├── page_2_processed.png
│   │   └── ...
│   ├── extracted_text.txt
│   └── metadata.json
└── ...
```

## 📋 Components Explained

### 1. Session Directories
Each OCR extraction creates a unique session directory with the format:
- `[filename]_[timestamp]_[engine]`
- Example: `homework_20241201_143022_tesseract`

### 2. Original Images (`original_images/`)
- Contains the raw images extracted from PDFs or source images
- Saved as PNG files for maximum quality
- Named as `page_1.png`, `page_2.png`, etc.

### 3. Preprocessed Images (`preprocessed_images/`)
- Contains images after preprocessing (denoising, skew correction, etc.)
- Shows exactly what the OCR engine processed
- Named as `page_1_processed.png`, `page_2_processed.png`, etc.

### 4. Extracted Text (`extracted_text.txt`)
- Contains the complete text extracted by the OCR engine
- UTF-8 encoded for proper character support
- Preserves original formatting and line breaks

### 5. Metadata (`metadata.json`)
- Contains processing information:
  ```json
  {
    "session_id": "homework_20241201_143022_tesseract",
    "original_file": "/path/to/original/file.pdf",
    "ocr_engine": "tesseract",
    "timestamp": "20241201_143022",
    "num_pages": 3,
    "text_length": 1542,
    "custom_metadata": {}
  }
  ```

## 🔧 Usage

### Automatic Data Saving
The OCR functions automatically save data when called:

```python
from extraction_service_v2 import extract_with_tesseract

# This will automatically save all extraction data
text = extract_with_tesseract("document.pdf")
```

### Disable Data Saving
To disable data saving (for production use):

```python
# Don't save extraction data
text = extract_with_tesseract("document.pdf", save_data=False)
```

### Testing the System
Run the test script to see the organization in action:

```bash
cd backend
python test_ocr_data_organization.py
```

## 🎯 Benefits

1. **Debugging**: Compare original vs preprocessed images to understand processing effects
2. **Quality Analysis**: Review extracted text alongside source images
3. **Engine Comparison**: Compare results from different OCR engines on the same document
4. **Performance Tracking**: Monitor OCR accuracy over time
5. **Training Data**: Use organized data for improving OCR models

## 📊 Supported OCR Engines

The system supports data organization for:
- ✅ Tesseract OCR
- ✅ PaddleOCR
- ✅ EasyOCR
- 🔄 UnstructuredIO (text-only, no image processing)

## 🧹 Maintenance

### Cleaning Old Data
The system doesn't automatically clean old extraction data. To manage storage:

```python
import shutil
from pathlib import Path
from datetime import datetime, timedelta

# Remove sessions older than 30 days
ocr_dir = Path("backend/data/ocr_extractions")
cutoff_date = datetime.now() - timedelta(days=30)

for session_dir in ocr_dir.iterdir():
    if session_dir.is_dir():
        if session_dir.stat().st_mtime < cutoff_date.timestamp():
            shutil.rmtree(session_dir)
```

### Storage Considerations
- Each PDF page generates ~2-3 MB of data (original + processed images)
- Text files are typically small (< 100KB)
- Monitor disk usage in production environments

## 🔍 Analysis Examples

### Compare OCR Engines
```bash
# Process the same document with different engines
python -c "
from extraction_service_v2 import *
file_path = 'test.pdf'
extract_with_tesseract(file_path)
extract_with_paddleocr(file_path)
extract_with_easyocr(file_path)
"
```

### Review Processing Quality
1. Open `original_images/page_1.png` to see the source
2. Open `preprocessed_images/page_1_processed.png` to see processing effects
3. Read `extracted_text.txt` to see OCR results
4. Check `metadata.json` for processing details

This organized approach makes it easy to understand, debug, and improve OCR performance! 