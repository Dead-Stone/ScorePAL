"""
Enhanced File Processor for LMS Submissions
Supports all common file types including code, documents, notebooks, and media files.
"""

import os
import json
import logging
import zipfile
import tarfile
import io
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
import re
import ast
import tempfile

# Document processing
import docx2txt
import pypdf
import fitz  # PyMuPDF

# Data and scientific files
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

# Notebook processing
try:
    import nbformat
    NBFORMAT_AVAILABLE = True
except ImportError:
    NBFORMAT_AVAILABLE = False

# Image processing
try:
    from PIL import Image
    import pytesseract
    IMAGE_PROCESSING_AVAILABLE = True
except ImportError:
    IMAGE_PROCESSING_AVAILABLE = False

# Web files
try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedFileProcessor:
    """Enhanced file processor supporting all common LMS submission types."""
    
    # Comprehensive file type mapping
    FILE_TYPE_MAPPING = {
        # Programming languages
        '.py': 'python',
        '.java': 'java',
        '.cpp': 'cpp',
        '.c': 'c',
        '.h': 'c_header',
        '.hpp': 'cpp_header',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.html': 'html',
        '.css': 'css',
        '.scss': 'scss',
        '.php': 'php',
        '.rb': 'ruby',
        '.go': 'go',
        '.rs': 'rust',
        '.swift': 'swift',
        '.kt': 'kotlin',
        '.scala': 'scala',
        '.r': 'r',
        '.R': 'r',
        '.m': 'matlab',
        '.sql': 'sql',
        '.sh': 'bash',
        '.bash': 'bash',
        '.zsh': 'zsh',
        '.ps1': 'powershell',
        '.bat': 'batch',
        
        # Configuration and data
        '.json': 'json',
        '.xml': 'xml',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.ini': 'ini',
        '.cfg': 'config',
        '.conf': 'config',
        '.properties': 'properties',
        '.csv': 'csv',
        '.tsv': 'tsv',
        
        # Documents
        '.pdf': 'pdf',
        '.docx': 'docx',
        '.doc': 'doc',
        '.txt': 'text',
        '.rtf': 'rtf',
        '.md': 'markdown',
        '.tex': 'latex',
        
        # Spreadsheets
        '.xlsx': 'excel',
        '.xls': 'excel',
        
        # Presentations
        '.pptx': 'powerpoint',
        '.ppt': 'powerpoint',
        
        # Notebooks
        '.ipynb': 'jupyter',
        '.rmd': 'rmarkdown',
        
        # Archives
        '.zip': 'zip',
        '.tar': 'tar',
        '.gz': 'gzip',
        '.rar': 'rar',
        '.7z': 'sevenzip',
        
        # Images
        '.jpg': 'image',
        '.jpeg': 'image',
        '.png': 'image',
        '.gif': 'image',
        '.bmp': 'image',
        '.svg': 'svg',
        '.tiff': 'image',
        '.webp': 'image',
    }
    
    def __init__(self, temp_dir: str = None):
        self.temp_dir = Path(temp_dir) if temp_dir else Path(tempfile.mkdtemp())
        self.temp_dir.mkdir(exist_ok=True, parents=True)
        
    def process_file(self, file_path: Union[str, Path]) -> Dict[str, Any]:
        """
        Process any file type and extract meaningful content.
        
        Args:
            file_path: Path to the file to process
            
        Returns:
            Dictionary containing processed content and metadata
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            return {
                'status': 'error',
                'error': f'File does not exist: {file_path}',
                'content': '',
                'metadata': {}
            }
        
        file_ext = file_path.suffix.lower()
        file_type = self.FILE_TYPE_MAPPING.get(file_ext, 'unknown')
        
        logger.info(f"Processing file: {file_path.name} (type: {file_type})")
        
        try:
            # Route to appropriate processor
            if file_type in ['python', 'java', 'cpp', 'c', 'javascript', 'typescript', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'sql']:
                return self._process_code_file(file_path, file_type)
            elif file_type in ['html', 'css', 'scss']:
                return self._process_web_file(file_path, file_type)
            elif file_type in ['bash', 'zsh', 'powershell', 'batch']:
                return self._process_script_file(file_path, file_type)
            elif file_type in ['json', 'xml', 'yaml', 'ini', 'config', 'properties']:
                return self._process_config_file(file_path, file_type)
            elif file_type in ['csv', 'tsv']:
                return self._process_data_file(file_path, file_type)
            elif file_type == 'pdf':
                return self._process_pdf_file(file_path)
            elif file_type in ['docx', 'doc']:
                return self._process_word_file(file_path)
            elif file_type == 'text':
                return self._process_text_file(file_path)
            elif file_type == 'markdown':
                return self._process_markdown_file(file_path)
            elif file_type == 'excel' and PANDAS_AVAILABLE:
                return self._process_excel_file(file_path)
            elif file_type == 'jupyter' and NBFORMAT_AVAILABLE:
                return self._process_jupyter_notebook(file_path)
            elif file_type == 'image' and IMAGE_PROCESSING_AVAILABLE:
                return self._process_image_file(file_path)
            elif file_type in ['zip', 'tar']:
                return self._process_archive_file(file_path, file_type)
            else:
                return self._process_generic_file(file_path)
                
        except Exception as e:
            logger.error(f"Error processing file {file_path}: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'content': '',
                'metadata': {'file_type': file_type, 'file_size': file_path.stat().st_size}
            }
    
    def _process_code_file(self, file_path: Path, language: str) -> Dict[str, Any]:
        """Process programming code files."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                code_content = f.read()
        except UnicodeDecodeError:
            with open(file_path, 'r', encoding='latin-1') as f:
                code_content = f.read()
        
        # Analyze code structure
        analysis = self._analyze_code_structure(code_content, language)
        
        # Create detailed content for grading
        detailed_content = f"""
FILE: {file_path.name}
LANGUAGE: {language.upper()}
SIZE: {len(code_content)} characters
LINES: {len(code_content.splitlines())} lines

=== CODE ANALYSIS ===
{analysis['summary']}

=== COMPLETE CODE ===
{code_content}

=== STRUCTURAL ANALYSIS ===
Functions: {len(analysis.get('functions', []))}
Classes: {len(analysis.get('classes', []))}
Imports: {len(analysis.get('imports', []))}
Comments: {analysis.get('comment_ratio', 0):.1%} of lines

Functions found: {', '.join(analysis.get('functions', [])[:10])}
Classes found: {', '.join(analysis.get('classes', [])[:10])}
Main imports: {', '.join(analysis.get('imports', [])[:10])}
"""
        
        return {
            'status': 'success',
            'content': detailed_content,
            'raw_code': code_content,
            'metadata': {
                'file_type': 'code',
                'language': language,
                'file_size': file_path.stat().st_size,
                'line_count': len(code_content.splitlines()),
                'analysis': analysis
            }
        }
    
    def _analyze_code_structure(self, code: str, language: str) -> Dict[str, Any]:
        """Analyze code structure based on language."""
        lines = code.splitlines()
        analysis = {
            'functions': [],
            'classes': [],
            'imports': [],
            'comment_ratio': 0,
            'summary': ''
        }
        
        comment_lines = 0
        
        if language == 'python':
            # Python-specific analysis
            try:
                tree = ast.parse(code)
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        analysis['functions'].append(node.name)
                    elif isinstance(node, ast.ClassDef):
                        analysis['classes'].append(node.name)
                    elif isinstance(node, ast.Import):
                        for alias in node.names:
                            analysis['imports'].append(alias.name)
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            analysis['imports'].append(node.module)
            except:
                pass
            
            # Count comments
            for line in lines:
                if line.strip().startswith('#'):
                    comment_lines += 1
                    
        elif language in ['java', 'cpp', 'c', 'javascript', 'typescript']:
            # C-style languages
            for line in lines:
                line = line.strip()
                if line.startswith('//') or line.startswith('/*'):
                    comment_lines += 1
                elif language == 'java' and ('class ' in line or 'interface ' in line):
                    match = re.search(r'(class|interface)\s+(\w+)', line)
                    if match:
                        analysis['classes'].append(match.group(2))
                elif 'function ' in line or (language in ['cpp', 'c'] and re.match(r'\w+\s+\w+\s*\(', line)):
                    match = re.search(r'(\w+)\s*\(', line)
                    if match:
                        analysis['functions'].append(match.group(1))
                elif language in ['javascript', 'typescript'] and 'import ' in line:
                    match = re.search(r'import.*from\s+[\'"]([^\'"]+)[\'"]', line)
                    if match:
                        analysis['imports'].append(match.group(1))
        
        analysis['comment_ratio'] = comment_lines / max(len(lines), 1)
        
        # Generate summary
        if analysis['functions'] or analysis['classes']:
            analysis['summary'] = f"Code contains {len(analysis['functions'])} functions and {len(analysis['classes'])} classes. "
        else:
            analysis['summary'] = "Code appears to be a script or procedural program. "
            
        analysis['summary'] += f"Comment ratio: {analysis['comment_ratio']:.1%}"
        
        return analysis
    
    def _process_web_file(self, file_path: Path, file_type: str) -> Dict[str, Any]:
        """Process HTML/CSS files."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(file_path, 'r', encoding='latin-1') as f:
                content = f.read()
        
        detailed_content = f"""
FILE: {file_path.name}
TYPE: {file_type.upper()} File
SIZE: {len(content)} characters
LINES: {len(content.splitlines())} lines

=== FILE ANALYSIS ===
{f"CSS rules: {content.count('{')}" if file_type == 'css' else f"HTML tags: {content.count('<')}"}

=== COMPLETE CODE ===
{content}
"""
        
        return {
            'status': 'success',
            'content': detailed_content,
            'raw_content': content,
            'metadata': {
                'file_type': file_type,
                'file_size': file_path.stat().st_size,
                'line_count': len(content.splitlines())
            }
        }
    
    def _process_script_file(self, file_path: Path, script_type: str) -> Dict[str, Any]:
        """Process shell/script files."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                script_content = f.read()
        except UnicodeDecodeError:
            with open(file_path, 'r', encoding='latin-1') as f:
                script_content = f.read()
        
        lines = script_content.splitlines()
        
        detailed_content = f"""
FILE: {file_path.name}
TYPE: {script_type.upper()} Script
SIZE: {len(script_content)} characters
LINES: {len(lines)} lines

=== SCRIPT ANALYSIS ===
Shebang: {lines[0] if lines and lines[0].startswith('#!') else 'None'}
Functions: {script_content.count('function ') + script_content.count('() {')}
Comments: {sum(1 for line in lines if line.strip().startswith('#'))} lines

=== COMPLETE SCRIPT ===
{script_content}
"""
        
        return {
            'status': 'success',
            'content': detailed_content,
            'raw_content': script_content,
            'metadata': {
                'file_type': 'script',
                'script_type': script_type,
                'file_size': file_path.stat().st_size,
                'line_count': len(lines)
            }
        }
    
    def _process_config_file(self, file_path: Path, config_type: str) -> Dict[str, Any]:
        """Process configuration files."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                config_content = f.read()
        except UnicodeDecodeError:
            with open(file_path, 'r', encoding='latin-1') as f:
                config_content = f.read()
        
        parsed_data = None
        if config_type == 'json':
            try:
                parsed_data = json.loads(config_content)
            except json.JSONDecodeError:
                pass
        
        detailed_content = f"""
FILE: {file_path.name}
TYPE: {config_type.upper()} Configuration
SIZE: {len(config_content)} characters

=== CONFIGURATION ANALYSIS ===
Valid {config_type.upper()}: {parsed_data is not None}
{f"Keys: {len(parsed_data) if isinstance(parsed_data, dict) else 'N/A'}" if parsed_data else ""}

=== COMPLETE CONFIGURATION ===
{config_content}
"""
        
        return {
            'status': 'success',
            'content': detailed_content,
            'raw_content': config_content,
            'parsed_data': parsed_data,
            'metadata': {
                'file_type': 'config',
                'config_type': config_type,
                'file_size': file_path.stat().st_size,
                'valid_format': parsed_data is not None
            }
        }
    
    def _process_data_file(self, file_path: Path, data_type: str) -> Dict[str, Any]:
        """Process CSV/TSV data files."""
        if not PANDAS_AVAILABLE:
            return self._process_text_file(file_path)
        
        try:
            if data_type == 'csv':
                df = pd.read_csv(file_path)
            else:  # tsv
                df = pd.read_csv(file_path, sep='\t')
            
            detailed_content = f"""
FILE: {file_path.name}
TYPE: {data_type.upper()} Data File
SIZE: {file_path.stat().st_size} bytes

=== DATA ANALYSIS ===
Rows: {len(df)}
Columns: {len(df.columns)}
Column names: {', '.join(df.columns.tolist())}

=== DATA PREVIEW (First 10 rows) ===
{df.head(10).to_string()}

=== DATA SUMMARY ===
{df.describe(include='all').to_string()}
"""
            
            return {
                'status': 'success',
                'content': detailed_content,
                'metadata': {
                    'file_type': 'data',
                    'data_type': data_type,
                    'file_size': file_path.stat().st_size,
                    'rows': len(df),
                    'columns': len(df.columns),
                    'column_names': df.columns.tolist()
                }
            }
        except Exception as e:
            # Fallback to text processing
            return self._process_text_file(file_path)
    
    def _process_pdf_file(self, file_path: Path) -> Dict[str, Any]:
        """Process PDF files with comprehensive OCR for handwritten content."""
        try:
            content_parts = []
            image_count = 0
            extraction_method = "unknown"
            
            # First, try PyMuPDF with OCR for comprehensive extraction
            try:
                doc = fitz.open(file_path)
                page_count = len(doc)
                
                for page_num in range(page_count):
                    page = doc.load_page(page_num)
                    
                    # Extract regular text
                    page_text = page.get_text()
                    if page_text.strip():
                        content_parts.append(f"\n--- Page {page_num + 1} Text ---\n")
                        content_parts.append(page_text)
                    
                    # Extract images and run OCR for handwritten content
                    if IMAGE_PROCESSING_AVAILABLE:
                        image_list = page.get_images()
                        for img_index, img in enumerate(image_list):
                            try:
                                # Get image data
                                xref = img[0]
                                pix = fitz.Pixmap(doc, xref)
                                
                                if pix.n - pix.alpha < 4:  # GRAY or RGB
                                    img_data = pix.tobytes("png")
                                    
                                    # Convert to PIL Image and run OCR with handwriting optimization
                                    from PIL import Image
                                    import pytesseract
                                    pil_image = Image.open(io.BytesIO(img_data))
                                    
                                    # Configure OCR for better handwriting recognition
                                    custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:;()[]{}/<>+=*-_| '
                                    ocr_text = pytesseract.image_to_string(pil_image, config=custom_config)
                                    
                                    if ocr_text.strip():
                                        content_parts.append(f"\n--- Page {page_num + 1} Image {img_index + 1} (OCR - Handwriting Optimized) ---\n")
                                        content_parts.append(ocr_text)
                                        image_count += 1
                                
                                pix = None  # Free memory
                            except Exception as e:
                                logger.warning(f"Error processing image {img_index} on page {page_num}: {e}")
                
                doc.close()
                extraction_method = "PyMuPDF_with_OCR"
                
            except Exception as e:
                logger.warning(f"PyMuPDF extraction failed: {e}")
                
                # Fallback to PyPDF2 + OCR
                try:
                    # Try pdf2image for OCR
                    if IMAGE_PROCESSING_AVAILABLE:
                        try:
                            import pdf2image
                            pages = pdf2image.convert_from_path(file_path)
                            for page_num, page_img in enumerate(pages):
                                # OCR with handwriting optimization
                                custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:;()[]{}/<>+=*-_| '
                                ocr_text = pytesseract.image_to_string(page_img, config=custom_config)
                                if ocr_text.strip():
                                    content_parts.append(f"\n--- Page {page_num + 1} OCR (Handwriting Optimized) ---\n")
                                    content_parts.append(ocr_text)
                                    image_count += 1
                            extraction_method = "pdf2image_OCR"
                        except Exception as ocr_e:
                            logger.warning(f"pdf2image OCR failed: {ocr_e}")
                    
                    # Basic PyPDF2 text extraction
                    with open(file_path, 'rb') as f:
                        reader = pypdf.PdfReader(f)
                        text = ""
                        for page in reader.pages:
                            text += page.extract_text() + "\n\n"
                        if text.strip():
                            content_parts.append("\n--- Basic Text Extraction ---\n")
                            content_parts.append(text)
                            if extraction_method == "unknown":
                                extraction_method = "PyPDF2_text_only"
                    
                except Exception as fallback_e:
                    logger.error(f"All PDF extraction methods failed: {fallback_e}")
                    return {
                        'status': 'error',
                        'error': f'PDF processing completely failed: {fallback_e}',
                        'content': '',
                        'metadata': {'file_type': 'pdf'}
                    }
            
            final_content = "\n".join(content_parts)
            
            detailed_content = f"""
FILE: {file_path.name}
TYPE: PDF Document (with OCR for Handwriting)
SIZE: {file_path.stat().st_size} bytes
EXTRACTION METHOD: {extraction_method}
IMAGES PROCESSED: {image_count}

=== EXTRACTED CONTENT ===
{final_content}

Note: This PDF was processed using advanced OCR to extract handwritten content.
If handwritten answers are still not detected properly, please also submit a typed version.
"""
            
            return {
                'status': 'success',
                'content': detailed_content,
                'raw_text': final_content,
                'metadata': {
                    'file_type': 'pdf',
                    'file_size': file_path.stat().st_size,
                    'extraction_method': extraction_method,
                    'images_processed': image_count,
                    'has_handwriting_ocr': True
                }
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': f'PDF processing failed: {e}',
                'content': '',
                'metadata': {'file_type': 'pdf'}
            }
    
    def _process_word_file(self, file_path: Path) -> Dict[str, Any]:
        """Process Word documents."""
        try:
            text = docx2txt.process(str(file_path))
            
            detailed_content = f"""
FILE: {file_path.name}
TYPE: Microsoft Word Document
SIZE: {file_path.stat().st_size} bytes

=== DOCUMENT CONTENT ===
{text}
"""
            
            return {
                'status': 'success',
                'content': detailed_content,
                'raw_text': text,
                'metadata': {
                    'file_type': 'word',
                    'file_size': file_path.stat().st_size,
                    'word_count': len(text.split())
                }
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Word processing failed: {e}',
                'content': '',
                'metadata': {'file_type': 'word'}
            }
    
    def _process_text_file(self, file_path: Path) -> Dict[str, Any]:
        """Process plain text files."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        except UnicodeDecodeError:
            with open(file_path, 'r', encoding='latin-1') as f:
                text = f.read()
        
        detailed_content = f"""
FILE: {file_path.name}
TYPE: Plain Text File
SIZE: {file_path.stat().st_size} bytes
LINES: {len(text.splitlines())} lines

=== TEXT CONTENT ===
{text}
"""
        
        return {
            'status': 'success',
            'content': detailed_content,
            'raw_text': text,
            'metadata': {
                'file_type': 'text',
                'file_size': file_path.stat().st_size,
                'line_count': len(text.splitlines()),
                'word_count': len(text.split())
            }
        }
    
    def _process_markdown_file(self, file_path: Path) -> Dict[str, Any]:
        """Process Markdown files."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                markdown_content = f.read()
        except UnicodeDecodeError:
            with open(file_path, 'r', encoding='latin-1') as f:
                markdown_content = f.read()
        
        # Count markdown elements
        headers = len(re.findall(r'^#+\s', markdown_content, re.MULTILINE))
        links = len(re.findall(r'\[.*?\]\(.*?\)', markdown_content))
        images = len(re.findall(r'!\[.*?\]\(.*?\)', markdown_content))
        
        detailed_content = f"""
FILE: {file_path.name}
TYPE: Markdown Document
SIZE: {file_path.stat().st_size} bytes
LINES: {len(markdown_content.splitlines())} lines

=== MARKDOWN ANALYSIS ===
Headers: {headers}
Links: {links}
Images: {images}

=== MARKDOWN CONTENT ===
{markdown_content}
"""
        
        return {
            'status': 'success',
            'content': detailed_content,
            'raw_markdown': markdown_content,
            'metadata': {
                'file_type': 'markdown',
                'file_size': file_path.stat().st_size,
                'line_count': len(markdown_content.splitlines()),
                'headers': headers,
                'links': links,
                'images': images
            }
        }
    
    def _process_excel_file(self, file_path: Path) -> Dict[str, Any]:
        """Process Excel files."""
        try:
            df = pd.read_excel(file_path, sheet_name=None)
            
            detailed_content = f"""
FILE: {file_path.name}
TYPE: Microsoft Excel Workbook
SIZE: {file_path.stat().st_size} bytes
SHEETS: {len(df)} sheets

=== WORKBOOK ANALYSIS ===
Sheet names: {', '.join(df.keys())}

"""
            
            for sheet_name, sheet_df in df.items():
                detailed_content += f"""
=== SHEET: {sheet_name} ===
Rows: {len(sheet_df)}
Columns: {len(sheet_df.columns)}
Column names: {', '.join(sheet_df.columns.tolist())}

Data preview:
{sheet_df.head().to_string()}

"""
            
            return {
                'status': 'success',
                'content': detailed_content,
                'metadata': {
                    'file_type': 'excel',
                    'file_size': file_path.stat().st_size,
                    'sheet_count': len(df),
                    'sheet_names': list(df.keys())
                }
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Excel processing failed: {e}',
                'content': '',
                'metadata': {'file_type': 'excel'}
            }
    
    def _process_jupyter_notebook(self, file_path: Path) -> Dict[str, Any]:
        """Process Jupyter notebooks."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                nb = nbformat.read(f, as_version=4)
            
            code_cells = []
            markdown_cells = []
            output_cells = []
            
            for cell in nb.cells:
                if cell.cell_type == 'code':
                    code_cells.append(cell.source)
                elif cell.cell_type == 'markdown':
                    markdown_cells.append(cell.source)
                    
                if 'outputs' in cell:
                    for output in cell.outputs:
                        if output.output_type == 'execute_result' or output.output_type == 'display_data':
                            if 'text/plain' in output.data:
                                output_cells.append(output.data['text/plain'])
            
            detailed_content = f"""
FILE: {file_path.name}
TYPE: Jupyter Notebook
SIZE: {file_path.stat().st_size} bytes
CELLS: {len(nb.cells)} total

=== NOTEBOOK ANALYSIS ===
Code cells: {len(code_cells)}
Markdown cells: {len(markdown_cells)}
Kernel: {nb.metadata.get('kernelspec', {}).get('display_name', 'Unknown')}

=== CODE CELLS ===
"""
            
            for i, code in enumerate(code_cells[:10]):  # Limit to first 10
                detailed_content += f"\n--- Cell {i+1} ---\n{code}\n"
            
            detailed_content += "\n=== MARKDOWN CELLS ===\n"
            for i, md in enumerate(markdown_cells[:5]):  # Limit to first 5
                detailed_content += f"\n--- Markdown {i+1} ---\n{md}\n"
            
            if output_cells:
                detailed_content += "\n=== OUTPUTS ===\n"
                for i, output in enumerate(output_cells[:5]):  # Limit to first 5
                    detailed_content += f"\n--- Output {i+1} ---\n{output}\n"
            
            return {
                'status': 'success',
                'content': detailed_content,
                'metadata': {
                    'file_type': 'jupyter',
                    'file_size': file_path.stat().st_size,
                    'cell_count': len(nb.cells),
                    'code_cells': len(code_cells),
                    'markdown_cells': len(markdown_cells),
                    'kernel': nb.metadata.get('kernelspec', {}).get('display_name', 'Unknown')
                }
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Jupyter notebook processing failed: {e}',
                'content': '',
                'metadata': {'file_type': 'jupyter'}
            }
    
    def _process_image_file(self, file_path: Path) -> Dict[str, Any]:
        """Process image files with OCR optimized for handwritten content."""
        try:
            with Image.open(file_path) as img:
                width, height = img.size
                mode = img.mode
                
                # Try OCR with multiple configurations for better handwriting recognition
                ocr_text = ""
                try:
                    # Configuration 1: Default OCR
                    ocr_text = pytesseract.image_to_string(img)
                    
                    # If default OCR yields poor results, try handwriting optimization
                    if len(ocr_text.strip()) < 20:
                        # Configuration 2: Optimized for handwriting
                        custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:;()[]{}/<>+=*-_| '
                        ocr_handwriting = pytesseract.image_to_string(img, config=custom_config)
                        
                        # Configuration 3: Try different PSM mode for dense text
                        psm_config = r'--oem 3 --psm 4'
                        ocr_dense = pytesseract.image_to_string(img, config=psm_config)
                        
                        # Use the longest result (likely most accurate)
                        all_results = [ocr_text, ocr_handwriting, ocr_dense]
                        ocr_text = max(all_results, key=len)
                        
                except Exception as e:
                    ocr_text = f"OCR failed: {e}"
            
            detailed_content = f"""
FILE: {file_path.name}
TYPE: Image File (with Handwriting OCR)
SIZE: {file_path.stat().st_size} bytes
DIMENSIONS: {width} x {height} pixels
MODE: {mode}

=== OCR EXTRACTED TEXT (Handwriting Optimized) ===
{ocr_text}

Note: This image was processed using advanced OCR optimized for handwritten content.
Multiple OCR configurations were tested to maximize text extraction accuracy.
For coding assignments, please also submit the code as a text file for proper analysis.
"""
            
            return {
                'status': 'success',
                'content': detailed_content,
                'ocr_text': ocr_text,
                'metadata': {
                    'file_type': 'image',
                    'file_size': file_path.stat().st_size,
                    'width': width,
                    'height': height,
                    'mode': mode
                }
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Image processing failed: {e}',
                'content': '',
                'metadata': {'file_type': 'image'}
            }
    
    def _process_archive_file(self, file_path: Path, archive_type: str) -> Dict[str, Any]:
        """Process archive files by extracting and analyzing contents."""
        extract_dir = self.temp_dir / f"extract_{file_path.stem}"
        extract_dir.mkdir(exist_ok=True)
        
        try:
            if archive_type == 'zip':
                with zipfile.ZipFile(file_path, 'r') as zip_ref:
                    zip_ref.extractall(extract_dir)
            elif archive_type == 'tar':
                with tarfile.open(file_path, 'r:*') as tar_ref:
                    tar_ref.extractall(extract_dir)
            
            # Analyze extracted contents
            files = list(extract_dir.rglob('*'))
            file_types = {}
            total_files = 0
            
            extracted_contents = []
            
            for extracted_file in files:
                if extracted_file.is_file():
                    total_files += 1
                    ext = extracted_file.suffix.lower()
                    file_types[ext] = file_types.get(ext, 0) + 1
                    
                    # Process important files
                    if ext in ['.py', '.java', '.cpp', '.c', '.js', '.html', '.css', '.txt', '.md']:
                        result = self.process_file(extracted_file)
                        if result['status'] == 'success':
                            extracted_contents.append({
                                'file': str(extracted_file.relative_to(extract_dir)),
                                'content': result['content'][:1000] + '...' if len(result['content']) > 1000 else result['content']
                            })
            
            detailed_content = f"""
FILE: {file_path.name}
TYPE: {archive_type.upper()} Archive
SIZE: {file_path.stat().st_size} bytes
EXTRACTED FILES: {total_files}

=== ARCHIVE CONTENTS ===
File types found: {file_types}

=== EXTRACTED FILE CONTENTS ===
"""
            
            for content in extracted_contents[:10]:  # Limit to first 10 files
                detailed_content += f"\n{'='*50}\nFILE: {content['file']}\n{'='*50}\n{content['content']}\n"
            
            return {
                'status': 'success',
                'content': detailed_content,
                'extracted_files': extracted_contents,
                'metadata': {
                    'file_type': 'archive',
                    'archive_type': archive_type,
                    'file_size': file_path.stat().st_size,
                    'total_files': total_files,
                    'file_types': file_types
                }
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Archive processing failed: {e}',
                'content': '',
                'metadata': {'file_type': 'archive'}
            }
    
    def _process_generic_file(self, file_path: Path) -> Dict[str, Any]:
        """Generic file processor for unknown types."""
        try:
            # Try to read as text first
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read(10000)  # Read first 10KB
                
                detailed_content = f"""
FILE: {file_path.name}
TYPE: Unknown/Generic File
SIZE: {file_path.stat().st_size} bytes

=== FILE CONTENT (First 10KB) ===
{content}
"""
                
                return {
                    'status': 'success',
                    'content': detailed_content,
                    'raw_content': content,
                    'metadata': {
                        'file_type': 'generic',
                        'file_size': file_path.stat().st_size,
                        'readable_as_text': True
                    }
                }
            except:
                # Binary file
                detailed_content = f"""
FILE: {file_path.name}
TYPE: Binary File
SIZE: {file_path.stat().st_size} bytes

=== BINARY FILE ANALYSIS ===
This appears to be a binary file that cannot be processed as text.
File size: {file_path.stat().st_size} bytes

For proper grading, please ensure you submit files in supported formats:
- Code files (.py, .java, .cpp, .js, etc.)
- Documents (.pdf, .docx, .txt, .md)
- Data files (.csv, .json, .xml)
- Notebooks (.ipynb)

If this file is essential for your submission, please provide additional documentation explaining its purpose and contents.
"""
                
                return {
                    'status': 'success',
                    'content': detailed_content,
                    'metadata': {
                        'file_type': 'binary',
                        'file_size': file_path.stat().st_size,
                        'readable_as_text': False
                    }
                }
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Generic file processing failed: {e}',
                'content': '',
                'metadata': {'file_type': 'unknown'}
            }
    
    def get_supported_extensions(self) -> List[str]:
        """Get list of all supported file extensions."""
        return list(self.FILE_TYPE_MAPPING.keys())
    
    def is_supported_file(self, file_path: Union[str, Path]) -> bool:
        """Check if a file type is supported."""
        file_path = Path(file_path)
        return file_path.suffix.lower() in self.FILE_TYPE_MAPPING
    
    def cleanup(self):
        """Clean up temporary files."""
        try:
            if self.temp_dir.exists():
                import shutil
                shutil.rmtree(self.temp_dir)
        except Exception as e:
            logger.error(f"Error cleaning up temp directory: {e}")
