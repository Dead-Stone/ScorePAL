@echo off
echo ========================================
echo ScorePAL - Dependency Installation
echo ========================================
echo.

echo Installing all required dependencies...
echo.

REM PDF Processing
echo Installing PDF processing libraries...
pip install PyMuPDF==1.19.0 pypdf==3.16.0 pypdfium2==4.25.0 pdfplumber==0.10.2
if %errorlevel% neq 0 (
    echo Warning: Some PDF libraries failed to install
)

REM Word Document Processing
echo.
echo Installing Word document processing libraries...
pip install python-docx==0.8.11 docx2txt>=0.8
if %errorlevel% neq 0 (
    echo Warning: Some Word libraries failed to install
)

REM OCR Processing
echo.
echo Installing OCR processing libraries...
pip install pytesseract==0.3.10 paddleocr==2.6.0.3 easyocr>=1.7.0 paddlepaddle==2.5.2
if %errorlevel% neq 0 (
    echo Warning: Some OCR libraries failed to install
)

REM AI Integration
echo.
echo Installing AI integration libraries...
pip install google-generativeai>=0.3.0
if %errorlevel% neq 0 (
    echo Warning: AI libraries failed to install
)

REM Document Processing
echo.
echo Installing document processing libraries...
pip install unstructured>=0.10.0
if %errorlevel% neq 0 (
    echo Warning: Document processing libraries failed to install
)

REM Additional Dependencies
echo.
echo Installing additional dependencies...
pip install reportlab>=4.0.0 opencv-python-headless>=4.8.0 pillow==10.0.1 nbformat>=5.0.0
if %errorlevel% neq 0 (
    echo Warning: Some additional libraries failed to install
)

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo To verify installation, run:
echo python scripts/check_file_support.py
echo.
pause 