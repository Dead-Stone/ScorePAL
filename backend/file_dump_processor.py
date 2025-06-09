"""
File Dump Processor for Multi-Agent Grading

This module processes and dumps all submission files to provide comprehensive
context to each agent in the multi-agent grading system.

Author: AI Grading System
Date: 2024
"""

import logging
import json
import zipfile
import shutil
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import tempfile
import mimetypes
from datetime import datetime

logger = logging.getLogger(__name__)


class FileDumpProcessor:
    """
    Processes submission files and creates comprehensive dumps for multi-agent analysis.
    """
    
    def __init__(self):
        """Initialize the file dump processor."""
        self.supported_text_extensions = {
            '.py', '.js', '.html', '.css', '.java', '.cpp', '.c', '.h', '.hpp',
            '.txt', '.md', '.json', '.xml', '.yaml', '.yml', '.csv', '.sql',
            '.sh', '.bat', '.ps1', '.php', '.rb', '.go', '.rs', '.swift',
            '.kt', '.scala', '.ts', '.jsx', '.tsx', '.vue', '.r', '.m', '.pl'
        }
        
        self.max_file_size = 5 * 1024 * 1024  # 5MB per file
        self.max_total_size = 50 * 1024 * 1024  # 50MB total
        
        logger.info("Initialized File Dump Processor")
    
    def process_submission_files(self, 
                               submission_path: Path, 
                               student_name: str = "Student") -> Dict[str, Any]:
        """
        Process all submission files and create a comprehensive dump.
        
        Args:
            submission_path: Path to the submission (file or directory)
            student_name: Name of the student
            
        Returns:
            Dictionary containing comprehensive file analysis
        """
        logger.info(f"Processing submission files for {student_name}")
        
        try:
            if not submission_path.exists():
                raise FileNotFoundError(f"Submission path does not exist: {submission_path}")
            
            # Create temporary working directory
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                
                # Extract or copy files
                extracted_files = self._extract_files(submission_path, temp_path)
                
                # Analyze all files
                file_analysis = self._analyze_files(extracted_files)
                
                # Create comprehensive text dump
                text_dump = self._create_text_dump(file_analysis)
                
                # Generate metadata
                metadata = self._generate_metadata(file_analysis, student_name)
                
                # Create final comprehensive submission
                comprehensive_submission = {
                    "student_name": student_name,
                    "submission_path": str(submission_path),
                    "file_count": len(file_analysis),
                    "total_size": sum(f["size"] for f in file_analysis),
                    "file_types": list(set(f["file_type"] for f in file_analysis)),
                    "programming_languages": list(set(f.get("language", "unknown") for f in file_analysis if f.get("language"))),
                    "text_dump": text_dump,
                    "file_analysis": file_analysis,
                    "metadata": metadata,
                    "processed_at": datetime.now().isoformat()
                }
                
                logger.info(f"Processed {len(file_analysis)} files for {student_name}")
                return comprehensive_submission
                
        except Exception as e:
            logger.error(f"Error processing submission files: {e}")
            return self._create_error_submission(student_name, str(e))
    
    def _extract_files(self, submission_path: Path, temp_path: Path) -> List[Path]:
        """Extract files from submission to temporary directory."""
        extracted_files = []
        
        if submission_path.is_file():
            if submission_path.suffix.lower() == '.zip':
                # Extract ZIP file
                try:
                    with zipfile.ZipFile(submission_path, 'r') as zip_ref:
                        zip_ref.extractall(temp_path)
                    
                    # Collect all extracted files
                    for file_path in temp_path.rglob('*'):
                        if file_path.is_file():
                            extracted_files.append(file_path)
                
                except zipfile.BadZipFile:
                    logger.error(f"Invalid ZIP file: {submission_path}")
                    # Copy as single file
                    dest_file = temp_path / submission_path.name
                    shutil.copy2(submission_path, dest_file)
                    extracted_files.append(dest_file)
            else:
                # Copy single file
                dest_file = temp_path / submission_path.name
                shutil.copy2(submission_path, dest_file)
                extracted_files.append(dest_file)
        
        elif submission_path.is_dir():
            # Copy entire directory
            shutil.copytree(submission_path, temp_path / "submission")
            for file_path in (temp_path / "submission").rglob('*'):
                if file_path.is_file():
                    extracted_files.append(file_path)
        
        return extracted_files
    
    def _analyze_files(self, file_paths: List[Path]) -> List[Dict[str, Any]]:
        """Analyze each file and extract metadata."""
        file_analysis = []
        total_size = 0
        
        for file_path in file_paths:
            try:
                # Skip files that are too large
                file_size = file_path.stat().st_size
                if file_size > self.max_file_size:
                    logger.warning(f"Skipping large file: {file_path.name} ({file_size} bytes)")
                    continue
                
                # Skip if total size exceeds limit
                if total_size + file_size > self.max_total_size:
                    logger.warning(f"Reached total size limit, skipping remaining files")
                    break
                
                total_size += file_size
                
                # Analyze file
                analysis = self._analyze_single_file(file_path)
                file_analysis.append(analysis)
                
            except Exception as e:
                logger.error(f"Error analyzing file {file_path}: {e}")
                file_analysis.append({
                    "name": file_path.name,
                    "path": str(file_path),
                    "size": 0,
                    "file_type": "error",
                    "content": f"Error reading file: {str(e)}",
                    "error": True
                })
        
        return file_analysis
    
    def _analyze_single_file(self, file_path: Path) -> Dict[str, Any]:
        """Analyze a single file and extract its content and metadata."""
        file_ext = file_path.suffix.lower()
        file_size = file_path.stat().st_size
        
        analysis = {
            "name": file_path.name,
            "path": str(file_path),
            "extension": file_ext,
            "size": file_size,
            "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
        }
        
        # Determine file type and language
        file_type, language = self._determine_file_type_and_language(file_path)
        analysis["file_type"] = file_type
        if language:
            analysis["language"] = language
        
        # Extract content if it's a text file
        if file_ext in self.supported_text_extensions or file_type == "text":
            try:
                content = self._read_file_content(file_path)
                analysis["content"] = content
                analysis["line_count"] = len(content.split('\n'))
                analysis["char_count"] = len(content)
                
                # Additional code analysis
                if file_type == "code":
                    code_analysis = self._analyze_code_content(content, language)
                    analysis.update(code_analysis)
                
            except Exception as e:
                analysis["content"] = f"Error reading file: {str(e)}"
                analysis["error"] = True
        else:
            analysis["content"] = f"[Binary file - {file_type}]"
            analysis["binary"] = True
        
        return analysis
    
    def _determine_file_type_and_language(self, file_path: Path) -> Tuple[str, Optional[str]]:
        """Determine file type and programming language."""
        file_ext = file_path.suffix.lower()
        
        # Programming languages
        language_map = {
            '.py': ('code', 'python'),
            '.js': ('code', 'javascript'),
            '.ts': ('code', 'typescript'),
            '.jsx': ('code', 'javascript'),
            '.tsx': ('code', 'typescript'),
            '.java': ('code', 'java'),
            '.cpp': ('code', 'cpp'),
            '.c': ('code', 'c'),
            '.h': ('code', 'c'),
            '.hpp': ('code', 'cpp'),
            '.cs': ('code', 'csharp'),
            '.php': ('code', 'php'),
            '.rb': ('code', 'ruby'),
            '.go': ('code', 'go'),
            '.rs': ('code', 'rust'),
            '.swift': ('code', 'swift'),
            '.kt': ('code', 'kotlin'),
            '.scala': ('code', 'scala'),
            '.r': ('code', 'r'),
            '.m': ('code', 'matlab'),
            '.pl': ('code', 'perl'),
            '.sh': ('code', 'bash'),
            '.bat': ('code', 'batch'),
            '.ps1': ('code', 'powershell'),
            '.sql': ('code', 'sql')
        }
        
        if file_ext in language_map:
            return language_map[file_ext]
        
        # Other text formats
        text_formats = {
            '.txt': 'text',
            '.md': 'markdown',
            '.html': 'html',
            '.css': 'css',
            '.json': 'json',
            '.xml': 'xml',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.csv': 'csv'
        }
        
        if file_ext in text_formats:
            return (text_formats[file_ext], None)
        
        # Use mimetypes as fallback
        mime_type, _ = mimetypes.guess_type(str(file_path))
        if mime_type:
            if mime_type.startswith('text/'):
                return ('text', None)
            elif mime_type.startswith('image/'):
                return ('image', None)
            elif mime_type.startswith('application/'):
                return ('application', None)
        
        return ('unknown', None)
    
    def _read_file_content(self, file_path: Path) -> str:
        """Read file content with encoding detection."""
        encodings = ['utf-8', 'utf-16', 'latin-1', 'cp1252']
        
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    return f.read()
            except UnicodeDecodeError:
                continue
            except Exception as e:
                logger.error(f"Error reading {file_path} with {encoding}: {e}")
                continue
        
        # If all encodings fail, read as binary and decode with errors='replace'
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            return content.decode('utf-8', errors='replace')
        except Exception as e:
            return f"Error reading file: {str(e)}"
    
    def _analyze_code_content(self, content: str, language: Optional[str]) -> Dict[str, Any]:
        """Analyze code content for additional metrics."""
        lines = content.split('\n')
        
        analysis = {
            "total_lines": len(lines),
            "non_empty_lines": len([line for line in lines if line.strip()]),
            "comment_lines": 0,
            "function_count": 0,
            "class_count": 0
        }
        
        # Language-specific analysis
        if language == 'python':
            analysis.update(self._analyze_python_code(content))
        elif language in ['javascript', 'typescript']:
            analysis.update(self._analyze_js_code(content))
        elif language == 'java':
            analysis.update(self._analyze_java_code(content))
        
        return analysis
    
    def _analyze_python_code(self, content: str) -> Dict[str, Any]:
        """Analyze Python-specific code metrics."""
        lines = content.split('\n')
        
        comment_lines = len([line for line in lines if line.strip().startswith('#')])
        function_count = content.count('def ')
        class_count = content.count('class ')
        import_count = len([line for line in lines if line.strip().startswith(('import ', 'from '))])
        
        return {
            "comment_lines": comment_lines,
            "function_count": function_count,
            "class_count": class_count,
            "import_count": import_count
        }
    
    def _analyze_js_code(self, content: str) -> Dict[str, Any]:
        """Analyze JavaScript/TypeScript-specific code metrics."""
        lines = content.split('\n')
        
        comment_lines = len([line for line in lines if line.strip().startswith(('//', '/*', '*'))])
        function_count = content.count('function ') + content.count('=>')
        class_count = content.count('class ')
        
        return {
            "comment_lines": comment_lines,
            "function_count": function_count,
            "class_count": class_count
        }
    
    def _analyze_java_code(self, content: str) -> Dict[str, Any]:
        """Analyze Java-specific code metrics."""
        lines = content.split('\n')
        
        comment_lines = len([line for line in lines if line.strip().startswith(('//', '/*', '*'))])
        method_count = content.count('public ') + content.count('private ') + content.count('protected ')
        class_count = content.count('class ') + content.count('interface ')
        
        return {
            "comment_lines": comment_lines,
            "function_count": method_count,
            "class_count": class_count
        }
    
    def _create_text_dump(self, file_analysis: List[Dict[str, Any]]) -> str:
        """Create a comprehensive text dump of all files for agent analysis."""
        dump_parts = [
            "=" * 80,
            "COMPREHENSIVE SUBMISSION ANALYSIS",
            "=" * 80,
            f"Total Files: {len(file_analysis)}",
            f"Generated: {datetime.now().isoformat()}",
            "=" * 80,
            ""
        ]
        
        for i, file_info in enumerate(file_analysis, 1):
            dump_parts.extend([
                f"FILE {i}: {file_info['name']}",
                "-" * 60,
                f"Path: {file_info['path']}",
                f"Type: {file_info['file_type']}",
                f"Size: {file_info['size']} bytes",
            ])
            
            if file_info.get('language'):
                dump_parts.append(f"Language: {file_info['language']}")
            
            if file_info.get('line_count'):
                dump_parts.append(f"Lines: {file_info['line_count']}")
            
            if file_info.get('function_count'):
                dump_parts.append(f"Functions: {file_info['function_count']}")
            
            if file_info.get('class_count'):
                dump_parts.append(f"Classes: {file_info['class_count']}")
            
            dump_parts.extend([
                "",
                "CONTENT:",
                "-" * 30
            ])
            
            if not file_info.get('binary', False) and not file_info.get('error', False):
                content = file_info.get('content', '')
                if len(content) > 10000:  # Truncate very large files
                    content = content[:10000] + "\n\n[... Content truncated ...]"
                dump_parts.append(content)
            else:
                dump_parts.append(file_info.get('content', '[No content available]'))
            
            dump_parts.extend([
                "",
                "=" * 60,
                ""
            ])
        
        return "\n".join(dump_parts)
    
    def _generate_metadata(self, file_analysis: List[Dict[str, Any]], student_name: str) -> Dict[str, Any]:
        """Generate comprehensive metadata for the submission."""
        metadata = {
            "student_name": student_name,
            "file_count": len(file_analysis),
            "total_size": sum(f["size"] for f in file_analysis),
            "file_types": {},
            "languages": {},
            "code_metrics": {
                "total_lines": 0,
                "total_functions": 0,
                "total_classes": 0,
                "total_comments": 0
            },
            "files_by_type": {
                "code": [],
                "text": [],
                "data": [],
                "other": []
            }
        }
        
        for file_info in file_analysis:
            file_type = file_info.get('file_type', 'unknown')
            language = file_info.get('language')
            
            # Count file types
            metadata["file_types"][file_type] = metadata["file_types"].get(file_type, 0) + 1
            
            # Count languages
            if language:
                metadata["languages"][language] = metadata["languages"].get(language, 0) + 1
            
            # Aggregate code metrics
            if file_type == 'code':
                metadata["code_metrics"]["total_lines"] += file_info.get("total_lines", 0)
                metadata["code_metrics"]["total_functions"] += file_info.get("function_count", 0)
                metadata["code_metrics"]["total_classes"] += file_info.get("class_count", 0)
                metadata["code_metrics"]["total_comments"] += file_info.get("comment_lines", 0)
                metadata["files_by_type"]["code"].append(file_info["name"])
            elif file_type in ['text', 'markdown']:
                metadata["files_by_type"]["text"].append(file_info["name"])
            elif file_type in ['json', 'csv', 'xml', 'yaml']:
                metadata["files_by_type"]["data"].append(file_info["name"])
            else:
                metadata["files_by_type"]["other"].append(file_info["name"])
        
        # Determine primary language
        if metadata["languages"]:
            primary_language = max(metadata["languages"], key=metadata["languages"].get)
            metadata["primary_language"] = primary_language
        
        return metadata
    
    def _create_error_submission(self, student_name: str, error_message: str) -> Dict[str, Any]:
        """Create an error submission when processing fails."""
        return {
            "student_name": student_name,
            "file_count": 0,
            "total_size": 0,
            "file_types": [],
            "programming_languages": [],
            "text_dump": f"Error processing submission: {error_message}",
            "file_analysis": [],
            "metadata": {
                "error": True,
                "error_message": error_message
            },
            "processed_at": datetime.now().isoformat(),
            "error": True
        } 