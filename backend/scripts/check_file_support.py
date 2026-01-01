#!/usr/bin/env python3
"""
ScorePAL - File Type Support Checker
Checks which file types are supported based on available dependencies.

@author: Mohana Moganti (@Dead-Stone)
@license: MIT
@repository: https://github.com/Dead-Stone/ScorePAL
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, List, Any

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FileSupportChecker:
    """Check file type support based on available dependencies."""
    
    def __init__(self):
        self.support_status = {}
        self.dependency_status = {}
        
    def check_dependencies(self):
        """Check which dependencies are available."""
        logger.info("Checking dependencies...")
        
        dependencies = {
            'PyMuPDF (PDF)': 'fitz',
            'python-docx (DOCX)': 'docx',
            'PIL (Images)': 'PIL',
            'pytesseract (OCR)': 'pytesseract',
            'nbformat (Jupyter)': 'nbformat',
            'paddleocr (OCR)': 'paddleocr',
            'easyocr (OCR)': 'easyocr',
            'unstructured (Document)': 'unstructured',
            'google.generativeai (AI)': 'google.generativeai',
            'reportlab (PDF Creation)': 'reportlab',
            'docx2txt (DOCX)': 'docx2txt',
            'pdfplumber (PDF)': 'pdfplumber',
            'pypdf (PDF)': 'pypdf',
            'pypdfium2 (PDF)': 'pypdfium2'
        }
        
        for dep_name, module_name in dependencies.items():
            try:
                __import__(module_name)
                self.dependency_status[dep_name] = True
                logger.info(f"✅ {dep_name}: Available")
            except ImportError:
                self.dependency_status[dep_name] = False
                logger.warning(f"⚠️ {dep_name}: Not available")
        
        return self.dependency_status
    
    def analyze_file_support(self):
        """Analyze which file types are supported based on available dependencies."""
        logger.info("Analyzing file type support...")
        
        # Define file types and their dependencies
        file_types = {
            'PDF (.pdf)': {
                'dependencies': ['PyMuPDF (PDF)', 'pypdf (PDF)', 'pypdfium2 (PDF)', 'pdfplumber (PDF)'],
                'ocr_support': ['pytesseract (OCR)', 'paddleocr (OCR)', 'easyocr (OCR)'],
                'description': 'Document processing with OCR fallback'
            },
            'DOCX (.docx)': {
                'dependencies': ['python-docx (DOCX)', 'docx2txt (DOCX)'],
                'ocr_support': [],
                'description': 'Microsoft Word documents'
            },
            'DOC (.doc)': {
                'dependencies': ['docx2txt (DOCX)'],
                'ocr_support': [],
                'description': 'Legacy Word documents (limited support)'
            },
            'TXT (.txt)': {
                'dependencies': [],
                'ocr_support': [],
                'description': 'Plain text files (native support)'
            },
            'Markdown (.md)': {
                'dependencies': [],
                'ocr_support': [],
                'description': 'Markdown files (native support)'
            },
            'CSV (.csv)': {
                'dependencies': [],
                'ocr_support': [],
                'description': 'Comma-separated values (native support)'
            },
            'Python (.py)': {
                'dependencies': [],
                'ocr_support': [],
                'description': 'Python source code files'
            },
            'Jupyter (.ipynb)': {
                'dependencies': ['nbformat (Jupyter)'],
                'ocr_support': [],
                'description': 'Jupyter notebook files'
            },
            'Images (.jpg/.png/.bmp/.tiff)': {
                'dependencies': ['PIL (Images)'],
                'ocr_support': ['pytesseract (OCR)', 'paddleocr (OCR)', 'easyocr (OCR)'],
                'description': 'Image files with OCR processing'
            },
            'ZIP (.zip)': {
                'dependencies': [],
                'ocr_support': [],
                'description': 'Archive files for batch processing'
            }
        }
        
        for file_type, info in file_types.items():
            # Check if core dependencies are available
            core_deps_available = all(
                self.dependency_status.get(dep, False) 
                for dep in info['dependencies']
            )
            
            # Check if OCR is available for images
            ocr_available = any(
                self.dependency_status.get(dep, False) 
                for dep in info['ocr_support']
            )
            
            # Determine support level
            if core_deps_available:
                if ocr_available:
                    support_level = "✅ Full Support"
                else:
                    support_level = "✅ Basic Support"
            elif not info['dependencies']:  # No dependencies required
                support_level = "✅ Native Support"
            else:
                support_level = "❌ Not Supported"
            
            self.support_status[file_type] = {
                'support_level': support_level,
                'core_deps_available': core_deps_available,
                'ocr_available': ocr_available,
                'description': info['description'],
                'missing_deps': [dep for dep in info['dependencies'] if not self.dependency_status.get(dep, False)]
            }
            
            logger.info(f"{support_level}: {file_type}")
            if not core_deps_available and info['dependencies']:
                missing = ', '.join(self.support_status[file_type]['missing_deps'])
                logger.info(f"   Missing: {missing}")
    
    def check_code_implementation(self):
        """Check if the code actually implements support for each file type."""
        logger.info("Checking code implementation...")
        
        # Check preprocessing_v2.py
        preprocessing_file = Path('../preprocessing_v2.py')
        if preprocessing_file.exists():
            with open(preprocessing_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            implemented_extensions = []
            if '.pdf' in content:
                implemented_extensions.append('.pdf')
            if '.docx' in content:
                implemented_extensions.append('.docx')
            if '.txt' in content:
                implemented_extensions.append('.txt')
            if '.ipynb' in content:
                implemented_extensions.append('.ipynb')
            if '.jpg' in content or '.png' in content:
                implemented_extensions.append('.jpg/.png')
            
            logger.info(f"Implemented extensions in preprocessing_v2.py: {', '.join(implemented_extensions)}")
        
        # Check services/file_preprocessor.py
        services_file = Path('../services/file_preprocessor.py')
        if services_file.exists():
            with open(services_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            implemented_extensions = []
            if '.pdf' in content:
                implemented_extensions.append('.pdf')
            if '.docx' in content:
                implemented_extensions.append('.docx')
            if '.txt' in content:
                implemented_extensions.append('.txt')
            if '.jpg' in content or '.png' in content:
                implemented_extensions.append('.jpg/.png')
            
            logger.info(f"Implemented extensions in services/file_preprocessor.py: {', '.join(implemented_extensions)}")
    
    def generate_report(self):
        """Generate a comprehensive support report."""
        logger.info("\n" + "="*60)
        logger.info("SCOREPAL FILE TYPE SUPPORT REPORT")
        logger.info("="*60)
        
        # Dependency summary
        available_deps = sum(self.dependency_status.values())
        total_deps = len(self.dependency_status)
        logger.info(f"\n📦 DEPENDENCY SUMMARY:")
        logger.info(f"Available: {available_deps}/{total_deps} dependencies")
        logger.info(f"Coverage: {(available_deps/total_deps)*100:.1f}%")
        
        # File type support summary
        logger.info(f"\n📁 FILE TYPE SUPPORT:")
        supported_count = 0
        total_types = len(self.support_status)
        
        for file_type, status in self.support_status.items():
            if '✅' in status['support_level']:
                supported_count += 1
            logger.info(f"{status['support_level']}: {file_type}")
            if status['missing_deps']:
                logger.info(f"   Missing: {', '.join(status['missing_deps'])}")
        
        logger.info(f"\n📊 SUMMARY:")
        logger.info(f"Supported file types: {supported_count}/{total_types}")
        logger.info(f"Support coverage: {(supported_count/total_types)*100:.1f}%")
        
        # Recommendations
        logger.info(f"\n💡 RECOMMENDATIONS:")
        if available_deps < total_deps * 0.7:
            logger.info("⚠️ Install missing dependencies for full functionality:")
            missing_deps = [dep for dep, available in self.dependency_status.items() if not available]
            for dep in missing_deps:
                logger.info(f"   - {dep}")
        
        # Save detailed report
        report_data = {
            'dependency_status': self.dependency_status,
            'file_support_status': self.support_status,
            'summary': {
                'available_deps': available_deps,
                'total_deps': total_deps,
                'supported_types': supported_count,
                'total_types': total_types
            }
        }
        
        report_path = Path('file_support_report.json')
        with open(report_path, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        logger.info(f"\n📄 Detailed report saved to: {report_path}")
        
        return supported_count == total_types

def main():
    """Run the file support check."""
    logger.info("🔍 Starting ScorePAL File Type Support Check")
    
    checker = FileSupportChecker()
    
    try:
        # Check dependencies
        checker.check_dependencies()
        
        # Analyze file support
        checker.analyze_file_support()
        
        # Check code implementation
        checker.check_code_implementation()
        
        # Generate report
        all_supported = checker.generate_report()
        
        if all_supported:
            logger.info("\n🎉 All file types are supported!")
            return 0
        else:
            logger.warning("\n⚠️ Some file types may not be fully supported. Check the report above.")
            return 1
            
    except Exception as e:
        logger.error(f"❌ Check failed with error: {e}")
        return 1

if __name__ == "__main__":
    exit(main()) 