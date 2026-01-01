# 🚀 ScorePAL Complete Installation Guide

## 📋 **Overview**

This guide will help you install all 14/14 dependencies to make ScorePAL fully functional with support for all file types.

## 🎯 **Quick Installation**

### **Option 1: Automated Script (Recommended)**
```bash
# Run the automated installation script
python scripts/install_all_dependencies.py
```

### **Option 2: Windows Batch Script**
```bash
# Double-click or run from command line
scripts/install_dependencies.bat
```

### **Option 3: Manual Installation**
```bash
# Install all dependencies manually
pip install PyMuPDF==1.19.0 pypdf==3.16.0 pypdfium2==4.25.0 pdfplumber==0.10.2
pip install python-docx==0.8.11 docx2txt>=0.8
pip install pytesseract==0.3.10 paddleocr==2.6.0.3 easyocr>=1.7.0 paddlepaddle==2.5.2
pip install google-generativeai>=0.3.0 unstructured>=0.10.0
pip install reportlab>=4.0.0 opencv-python-headless>=4.8.0 pillow==10.0.1 nbformat>=5.0.0
```

## 📦 **Dependencies by Category**

### **1. PDF Processing (4 dependencies)**
```bash
pip install PyMuPDF==1.19.0 pypdf==3.16.0 pypdfium2==4.25.0 pdfplumber==0.10.2
```
- **PyMuPDF**: High-performance PDF processing
- **pypdf**: Pure Python PDF library
- **pypdfium2**: Fast PDF rendering
- **pdfplumber**: PDF text extraction

### **2. Word Document Processing (2 dependencies)**
```bash
pip install python-docx==0.8.11 docx2txt>=0.8
```
- **python-docx**: Modern DOCX processing
- **docx2txt**: Legacy DOC/DOCX support

### **3. OCR Processing (4 dependencies)**
```bash
pip install pytesseract==0.3.10 paddleocr==2.6.0.3 easyocr>=1.7.0 paddlepaddle==2.5.2
```
- **pytesseract**: Tesseract OCR wrapper
- **paddleocr**: Baidu's OCR engine
- **easyocr**: Easy-to-use OCR
- **paddlepaddle**: PaddleOCR backend

### **4. AI Integration (1 dependency)**
```bash
pip install google-generativeai>=0.3.0
```
- **google-generativeai**: Google Gemini AI integration

### **5. Document Processing (1 dependency)**
```bash
pip install unstructured>=0.10.0
```
- **unstructured**: Advanced document parsing

### **6. Additional Dependencies (2 dependencies)**
```bash
pip install reportlab>=4.0.0 opencv-python-headless>=4.8.0 pillow==10.0.1 nbformat>=5.0.0
```
- **reportlab**: PDF creation (for testing)
- **opencv-python-headless**: Computer vision
- **pillow**: Image processing
- **nbformat**: Jupyter notebook support

## 🔧 **System Dependencies**

### **Windows**
```bash
# Install Tesseract OCR
# Download from: https://github.com/UB-Mannheim/tesseract/wiki

# Install Poppler (for PDF processing)
# Download from: https://poppler.freedesktop.org/
```

### **macOS**
```bash
# Install Tesseract OCR
brew install tesseract

# Install Poppler
brew install poppler
```

### **Linux (Ubuntu/Debian)**
```bash
# Install Tesseract OCR
sudo apt-get install tesseract-ocr

# Install Poppler
sudo apt-get install poppler-utils
```

## 🚀 **Installation Steps**

### **Step 1: Check Current Status**
```bash
python scripts/check_file_support.py
```

### **Step 2: Install Dependencies**
```bash
# Option A: Automated installation
python scripts/install_all_dependencies.py

# Option B: Manual installation
pip install -r requirements.txt
pip install PyMuPDF==1.19.0 pypdf==3.16.0 pypdfium2==4.25.0 pdfplumber==0.10.2
pip install python-docx==0.8.11 docx2txt>=0.8
pip install pytesseract==0.3.10 paddleocr==2.6.0.3 easyocr>=1.7.0 paddlepaddle==2.5.2
pip install google-generativeai>=0.3.0 unstructured>=0.10.0
pip install reportlab>=4.0.0 opencv-python-headless>=4.8.0 pillow==10.0.1 nbformat>=5.0.0
```

### **Step 3: Verify Installation**
```bash
python scripts/check_file_support.py
```

### **Step 4: Test File Types**
```bash
python scripts/test_file_types.py
```

## 🎯 **Expected Results**

After successful installation, you should see:

### **Dependency Status**
```
✅ PyMuPDF (PDF): Available
✅ python-docx (DOCX): Available
✅ PIL (Images): Available
✅ pytesseract (OCR): Available
✅ nbformat (Jupyter): Available
✅ paddleocr (OCR): Available
✅ easyocr (OCR): Available
✅ unstructured (Document): Available
✅ google.generativeai (AI): Available
✅ reportlab (PDF Creation): Available
✅ docx2txt (DOCX): Available
✅ pdfplumber (PDF): Available
✅ pypdf (PDF): Available
✅ pypdfium2 (PDF): Available
```

### **File Type Support**
```
✅ Full Support: PDF (.pdf)
✅ Full Support: DOCX (.docx)
✅ Full Support: DOC (.doc)
✅ Native Support: TXT (.txt)
✅ Native Support: Markdown (.md)
✅ Native Support: CSV (.csv)
✅ Basic Support: Python (.py)
✅ Basic Support: Jupyter (.ipynb)
✅ Full Support: Images (.jpg/.png/.bmp/.tiff)
✅ Basic Support: ZIP (.zip)
```

## 🔧 **Troubleshooting**

### **Common Issues**

#### **1. OCR Installation Fails**
```bash
# Try installing without GPU support
pip install paddlepaddle==2.5.2 -i https://pypi.tuna.tsinghua.edu.cn/simple
```

#### **2. PDF Libraries Conflict**
```bash
# Uninstall conflicting packages
pip uninstall PyPDF2 PyPDF4

# Install specific versions
pip install PyMuPDF==1.19.0 pypdf==3.16.0
```

#### **3. Memory Issues with Large Models**
```bash
# Install CPU-only versions
pip install paddlepaddle-cpu==2.5.2
pip install opencv-python-headless>=4.8.0
```

#### **4. Tesseract Not Found**
```bash
# Windows: Add Tesseract to PATH
# macOS: brew install tesseract
# Linux: sudo apt-get install tesseract-ocr
```

### **Alternative Installation Methods**

#### **Using Conda**
```bash
conda install -c conda-forge pytesseract paddlepaddle
pip install google-generativeai unstructured
```

#### **Using Virtual Environment**
```bash
python -m venv scorepal_env
source scorepal_env/bin/activate  # Linux/macOS
# or
scorepal_env\Scripts\activate  # Windows

pip install -r requirements.txt
```

## 📊 **Verification Commands**

### **Check Dependencies**
```python
# Test imports
import fitz  # PyMuPDF
import docx  # python-docx
import cv2   # OpenCV
import pytesseract  # Tesseract
import paddleocr  # PaddleOCR
import easyocr  # EasyOCR
import google.generativeai  # Gemini AI
import unstructured  # Document processing
```

### **Test File Processing**
```python
# Test PDF processing
from preprocessing_v2 import FilePreprocessor
processor = FilePreprocessor()
result = processor.extract_text_from_file("test.pdf")
print(f"PDF processing: {'✅' if result else '❌'}")

# Test DOCX processing
result = processor.extract_text_from_file("test.docx")
print(f"DOCX processing: {'✅' if result else '❌'}")

# Test OCR processing
result = processor.extract_text_from_file("test.jpg")
print(f"OCR processing: {'✅' if result else '❌'}")
```

## 🎉 **Success Indicators**

After successful installation, you should see:

1. **All 14 dependencies available** ✅
2. **All 10 file types supported** ✅
3. **No import errors** ✅
4. **File processing working** ✅
5. **OCR functionality available** ✅
6. **AI integration ready** ✅

## 📞 **Support**

If you encounter issues:

1. **Check the error logs** in the installation report
2. **Try manual installation** for failed dependencies
3. **Verify system requirements** (Python 3.8+, sufficient RAM)
4. **Check network connectivity** for package downloads
5. **Try alternative package sources** if needed

---

**🎯 Goal**: Achieve 14/14 dependencies and 10/10 file types supported for full ScorePAL functionality! 