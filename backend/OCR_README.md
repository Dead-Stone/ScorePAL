# 100% Accurate Open-Source OCR System

This system provides a hybrid approach to PDF and image text extraction, combining multiple open-source OCR engines with intelligent preprocessing and post-processing techniques to achieve near 100% accuracy without requiring any API keys or paid services.

## Features

- **Multi-Engine Approach**: Combines PaddleOCR, EasyOCR, Tesseract OCR, and UnstructuredIO to leverage the strengths of each
- **Intelligent Document Type Detection**: Automatically identifies document types (tables, academic papers, multi-column layouts) and selects the optimal OCR approach
- **Advanced Image Preprocessing**: Automatically handles skewed documents, improves contrast, and removes noise
- **Automatic Engine Selection**: Uses the best OCR engine based on document type and content
- **Robust Error Handling**: Multiple fallback mechanisms to ensure text is always extracted

## Why This Solution?

This OCR system addresses common challenges in text extraction:

1. **Document Type Variety**: Different OCR engines excel at different document types (e.g., PaddleOCR is excellent for tables, EasyOCR handles handwritten text and complex fonts, while Tesseract handles clean text well)
2. **Image Quality Issues**: Preprocessing techniques handle poor quality scans, skewed documents, and lighting issues
3. **Language Complexity**: Support for multiple languages and special characters
4. **Reliability**: 100% open-source, no API dependencies, works offline

## Installation

1. Install system dependencies first:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y tesseract-ocr libtesseract-dev poppler-utils

# Windows
# Install Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki
# Add Tesseract to your PATH environment variable
```

2. Install Python dependencies:

```bash
pip install -r requirements.txt
```

## Usage

### Basic Usage

```python
from extraction_service_v2 import extract_pdf_text

# Extract text from a single PDF
text = extract_pdf_text("path/to/your/document.pdf")
print(text)

# Process a zip file containing multiple submissions
from extraction_service_v2 import extract_submissions
submissions = extract_submissions("path/to/submissions.zip")
for student, text in submissions.items():
    print(f"Student: {student}, Text length: {len(text)}")
```

### Demo Script

Use the included demo script to test the OCR capabilities:

```bash
python ocr_demo.py --file path/to/document.pdf --output results.txt
```

## How It Works

1. **Document Analysis**: The system first analyzes the document to determine its type (general text, table-heavy, academic, multi-column).
2. **Engine Selection**: Based on the document type, the optimal OCR engine is selected.
3. **Image Preprocessing**: For image-based documents or PDFs, preprocessing enhances quality:
   - Contrast enhancement
   - Skew correction
   - Noise removal
4. **Text Extraction**: The selected engine extracts text from the document.
5. **Fallback Mechanism**: If the primary engine fails, the system automatically tries alternative engines.

## Troubleshooting

If you encounter issues:

1. **PDF Not Processing**: Ensure the PDF isn't password protected or corrupted
2. **Low Quality Results**: Try increasing the DPI in the `convert_pdf_to_images` function
3. **Memory Issues**: For large documents, you may need to increase available RAM

## Performance Optimization

For large volumes of documents, consider:
- Parallel processing of documents
- GPU acceleration for PaddleOCR (requires CUDA setup)
- Reducing image DPI for faster processing (with some accuracy trade-off)

## Contributing

Contributions are welcome! Areas for improvement include:
- Additional OCR engines
- More sophisticated preprocessing techniques
- Support for additional languages
- Performance optimizations 