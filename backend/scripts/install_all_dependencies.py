#!/usr/bin/env python3
"""
ScorePAL - Complete Dependency Installation Script
Installs all required dependencies for full ScorePAL functionality.

@author: Mohana Moganti (@Dead-Stone)
@license: MIT
@repository: https://github.com/Dead-Stone/ScorePAL
"""

import os
import sys
import subprocess
import logging
import json
from pathlib import Path
from typing import Dict, List, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DependencyInstaller:
    """Install all missing dependencies for ScorePAL."""
    
    def __init__(self):
        self.installation_results = {}
        self.dependencies = {
            # PDF Processing
            'PyMuPDF': 'PyMuPDF==1.19.0',
            'pypdf': 'pypdf==3.16.0',
            'pypdfium2': 'pypdfium2==4.25.0',
            'pdfplumber': 'pdfplumber==0.10.2',
            
            # Word Document Processing
            'python-docx': 'python-docx==0.8.11',
            'docx2txt': 'docx2txt>=0.8',
            
            # OCR Processing
            'pytesseract': 'pytesseract==0.3.10',
            'paddleocr': 'paddleocr==2.6.0.3',
            'easyocr': 'easyocr>=1.7.0',
            'paddlepaddle': 'paddlepaddle==2.5.2',
            
            # AI Integration
            'google-generativeai': 'google-generativeai>=0.3.0',
            
            # Document Processing
            'unstructured': 'unstructured>=0.10.0',
            
            # PDF Creation (for testing)
            'reportlab': 'reportlab>=4.0.0',
            
            # Additional dependencies
            'opencv-python-headless': 'opencv-python-headless>=4.8.0',
            'pillow': 'pillow==10.0.1',
            'nbformat': 'nbformat>=5.0.0'
        }
    
    def check_current_dependencies(self):
        """Check which dependencies are currently installed."""
        logger.info("Checking current dependencies...")
        
        current_status = {}
        for dep_name, package_name in self.dependencies.items():
            try:
                __import__(dep_name.lower().replace('-', '_').replace('google-generativeai', 'google.generativeai'))
                current_status[dep_name] = True
                logger.info(f"✅ {dep_name}: Already installed")
            except ImportError:
                current_status[dep_name] = False
                logger.warning(f"⚠️ {dep_name}: Not installed")
        
        return current_status
    
    def install_dependency(self, dep_name: str, package_name: str) -> bool:
        """Install a single dependency."""
        try:
            logger.info(f"Installing {dep_name}...")
            
            # Use pip to install the package
            result = subprocess.run([
                sys.executable, '-m', 'pip', 'install', package_name
            ], capture_output=True, text=True, check=True)
            
            logger.info(f"✅ {dep_name}: Successfully installed")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ {dep_name}: Installation failed")
            logger.error(f"Error: {e.stderr}")
            return False
        except Exception as e:
            logger.error(f"❌ {dep_name}: Unexpected error - {e}")
            return False
    
    def install_all_dependencies(self):
        """Install all missing dependencies."""
        logger.info("Starting dependency installation...")
        
        # Check current status
        current_status = self.check_current_dependencies()
        
        # Install missing dependencies
        missing_deps = [dep for dep, installed in current_status.items() if not installed]
        
        if not missing_deps:
            logger.info("🎉 All dependencies are already installed!")
            return True
        
        logger.info(f"Installing {len(missing_deps)} missing dependencies...")
        
        successful_installations = 0
        failed_installations = 0
        
        for dep_name in missing_deps:
            package_name = self.dependencies[dep_name]
            
            if self.install_dependency(dep_name, package_name):
                successful_installations += 1
                self.installation_results[dep_name] = True
            else:
                failed_installations += 1
                self.installation_results[dep_name] = False
        
        logger.info(f"\n📊 Installation Summary:")
        logger.info(f"✅ Successful: {successful_installations}")
        logger.info(f"❌ Failed: {failed_installations}")
        
        return failed_installations == 0
    
    def verify_installations(self):
        """Verify that all dependencies are now available."""
        logger.info("Verifying installations...")
        
        verification_results = {}
        all_available = True
        
        for dep_name, package_name in self.dependencies.items():
            try:
                # Handle special cases for import names
                import_name = dep_name.lower().replace('-', '_')
                if dep_name == 'google-generativeai':
                    import_name = 'google.generativeai'
                elif dep_name == 'python-docx':
                    import_name = 'docx'
                elif dep_name == 'opencv-python-headless':
                    import_name = 'cv2'
                
                __import__(import_name)
                verification_results[dep_name] = True
                logger.info(f"✅ {dep_name}: Verified")
            except ImportError as e:
                verification_results[dep_name] = False
                all_available = False
                logger.error(f"❌ {dep_name}: Verification failed - {e}")
        
        return verification_results, all_available
    
    def generate_installation_report(self):
        """Generate a comprehensive installation report."""
        logger.info("\n" + "="*60)
        logger.info("DEPENDENCY INSTALLATION REPORT")
        logger.info("="*60)
        
        # Installation results
        successful = sum(self.installation_results.values())
        total = len(self.installation_results)
        
        logger.info(f"\n📦 INSTALLATION RESULTS:")
        logger.info(f"Successful: {successful}/{total}")
        logger.info(f"Success rate: {(successful/total)*100:.1f}%")
        
        # Verification results
        verification_results, all_available = self.verify_installations()
        
        logger.info(f"\n🔍 VERIFICATION RESULTS:")
        verified = sum(verification_results.values())
        logger.info(f"Verified: {verified}/{len(verification_results)}")
        logger.info(f"Verification rate: {(verified/len(verification_results))*100:.1f}%")
        
        # Save detailed report
        report_data = {
            'installation_results': self.installation_results,
            'verification_results': verification_results,
            'summary': {
                'successful_installations': successful,
                'total_installations': total,
                'verified_dependencies': verified,
                'total_dependencies': len(verification_results),
                'all_available': all_available
            }
        }
        
        report_path = Path('dependency_installation_report.json')
        with open(report_path, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        logger.info(f"\n📄 Detailed report saved to: {report_path}")
        
        return all_available
    
    def provide_manual_instructions(self):
        """Provide manual installation instructions for failed dependencies."""
        logger.info("\n💡 MANUAL INSTALLATION INSTRUCTIONS:")
        logger.info("If some dependencies failed to install automatically, try these manual steps:")
        
        logger.info("\n1. PDF Processing:")
        logger.info("   pip install PyMuPDF==1.19.0 pypdf==3.16.0 pypdfium2==4.25.0 pdfplumber==0.10.2")
        
        logger.info("\n2. Word Document Processing:")
        logger.info("   pip install python-docx==0.8.11 docx2txt>=0.8")
        
        logger.info("\n3. OCR Processing:")
        logger.info("   pip install pytesseract==0.3.10 paddleocr==2.6.0.3 easyocr>=1.7.0 paddlepaddle==2.5.2")
        
        logger.info("\n4. AI Integration:")
        logger.info("   pip install google-generativeai>=0.3.0")
        
        logger.info("\n5. Document Processing:")
        logger.info("   pip install unstructured>=0.10.0")
        
        logger.info("\n6. Additional Dependencies:")
        logger.info("   pip install reportlab>=4.0.0 opencv-python-headless>=4.8.0 pillow==10.0.1 nbformat>=5.0.0")
        
        logger.info("\n7. System Dependencies (if needed):")
        logger.info("   - Tesseract OCR: https://github.com/tesseract-ocr/tesseract")
        logger.info("   - Poppler (for PDF): https://poppler.freedesktop.org/")

def main():
    """Run the complete dependency installation."""
    logger.info("🚀 Starting ScorePAL Complete Dependency Installation")
    
    installer = DependencyInstaller()
    
    try:
        # Install all dependencies
        success = installer.install_all_dependencies()
        
        # Generate report
        all_available = installer.generate_installation_report()
        
        if all_available:
            logger.info("\n🎉 All dependencies are now available!")
            logger.info("ScorePAL is ready for full functionality!")
            return 0
        else:
            logger.warning("\n⚠️ Some dependencies may not be fully functional.")
            installer.provide_manual_instructions()
            return 1
            
    except Exception as e:
        logger.error(f"❌ Installation failed with error: {e}")
        installer.provide_manual_instructions()
        return 1

if __name__ == "__main__":
    exit(main()) 