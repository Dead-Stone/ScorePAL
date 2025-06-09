"""
Intelligent Grading Router

Automatically determines the best grading approach based on file types and content.
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional, Union
from pathlib import Path
from datetime import datetime
from enum import Enum

from grading_v2 import GradingService
from multi_agent_grading import MultiAgentGradingService
from document_processor import DocumentProcessor

logger = logging.getLogger(__name__)


class GradingStrategy(Enum):
    """Available grading strategies."""
    SINGLE_CODE = "single_code"
    SINGLE_DOCUMENT = "single_document" 
    SINGLE_ENHANCED = "single_enhanced"
    MULTI_AGENT = "multi_agent"


class IntelligentGradingRouter:
    """Intelligent router that selects optimal grading approach automatically."""
    
    def __init__(self, api_key: str):
        """Initialize the intelligent grading router."""
        self.api_key = api_key
        self.grading_service = GradingService(api_key)
        self.multi_agent_service = None
        self.document_processor = DocumentProcessor()
        logger.info("Initialized Intelligent Grading Router")
    
    async def route_and_grade(self,
                            file_paths: Union[List[Path], Path],
                            student_name: str = "Student",
                            rubric: Optional[Dict[str, Any]] = None,
                            strictness: float = 0.5,
                            force_multi_agent: bool = False) -> Dict[str, Any]:
        """Automatically route to best grading approach and grade submission."""
        try:
            # Normalize to list
            if isinstance(file_paths, Path):
                file_paths = [file_paths]
            
            logger.info(f"Routing grading for {len(file_paths)} files")
            
            # Analyze submission
            analysis = await self._analyze_submission(file_paths)
            
            # Select strategy
            if force_multi_agent:
                strategy = GradingStrategy.MULTI_AGENT
                reason = "Multi-agent forced"
            else:
                strategy, reason = self._select_strategy(analysis)
            
            logger.info(f"Selected: {strategy.value} - {reason}")
            
            # Execute grading
            result = await self._execute_grading(strategy, analysis, student_name, rubric, strictness)
            
            # Add routing info
            result["routing_info"] = {
                "strategy_used": strategy.value,
                "selection_reason": reason,
                "file_count": len(file_paths),
                "routed_at": datetime.now().isoformat()
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Routing error: {e}")
            return await self._fallback_grading(file_paths, student_name, rubric, strictness, str(e))
    
    async def _analyze_submission(self, file_paths: List[Path]) -> Dict[str, Any]:
        """Analyze submission characteristics."""
        analysis = {
            "file_count": len(file_paths),
            "file_types": set(),
            "has_code": False,
            "has_documents": False,
            "complexity_score": 0,
            "supported_files": []
        }
        
        for file_path in file_paths:
            try:
                if self.document_processor.is_supported(file_path):
                    analysis["supported_files"].append(str(file_path))
                    
                    file_ext = file_path.suffix.lower()
                    file_type = self.document_processor.supported_extensions.get(file_ext, 'unknown')
                    analysis["file_types"].add(file_type)
                    
                    if file_type == 'code':
                        analysis["has_code"] = True
                        analysis["complexity_score"] += 3
                    elif file_type in ['pdf', 'docx', 'doc', 'text']:
                        analysis["has_documents"] = True
                        analysis["complexity_score"] += 2
                    else:
                        analysis["complexity_score"] += 1
                        
            except Exception as e:
                logger.warning(f"Error analyzing {file_path}: {e}")
        
        # Determine complexity
        if analysis["complexity_score"] > 8 or analysis["file_count"] > 5:
            analysis["complexity_level"] = "high"
        elif analysis["complexity_score"] > 4 or analysis["file_count"] > 2:
            analysis["complexity_level"] = "medium"
        else:
            analysis["complexity_level"] = "low"
        
        return analysis
    
    def _select_strategy(self, analysis: Dict[str, Any]) -> tuple:
        """Select optimal grading strategy."""
        complexity = analysis["complexity_level"]
        file_count = analysis["file_count"]
        has_code = analysis["has_code"]
        has_documents = analysis["has_documents"]
        
        # Multi-agent conditions
        if complexity == "high" or file_count > 5:
            return GradingStrategy.MULTI_AGENT, f"High complexity or many files ({file_count})"
        
        if has_code and has_documents:
            return GradingStrategy.MULTI_AGENT, "Mixed code and document content"
        
        if has_code and analysis["complexity_score"] > 6:
            return GradingStrategy.MULTI_AGENT, "Complex code submission"
        
        if has_documents and any('pdf' in str(f) or 'docx' in str(f) for f in analysis["supported_files"]):
            return GradingStrategy.MULTI_AGENT, "Important document submission"
        
        # Single agent conditions
        if has_code and not has_documents:
            return GradingStrategy.SINGLE_CODE, "Code-only submission"
        
        if has_documents and not has_code:
            return GradingStrategy.SINGLE_DOCUMENT, "Document-only submission"
        
        return GradingStrategy.SINGLE_ENHANCED, "Standard submission"
    
    async def _execute_grading(self, strategy: GradingStrategy, analysis: Dict[str, Any],
                             student_name: str, rubric: Optional[Dict], strictness: float) -> Dict[str, Any]:
        """Execute grading with selected strategy."""
        file_paths = [Path(p) for p in analysis["supported_files"]]
        
        if not file_paths:
            raise ValueError("No supported files found")
        
        # Process files
        content_parts = []
        file_metadata = {"file_type": "mixed", "strategy": strategy.value}
        
        for file_path in file_paths:
            file_analysis = self.document_processor.process_file(file_path)
            content_parts.append(f"\n=== FILE: {file_analysis['name']} ===\n")
            content_parts.append(file_analysis['content'])
            
            # Update metadata
            if file_analysis['file_type'] == 'code':
                file_metadata["file_type"] = "code"
        
        submission_text = "\n".join(content_parts)
        
        # Execute strategy
        if strategy == GradingStrategy.MULTI_AGENT:
            return await self._grade_multi_agent(submission_text, file_metadata, student_name, rubric)
        elif strategy == GradingStrategy.SINGLE_CODE:
            return self._grade_single_code(submission_text, file_metadata, student_name, rubric, strictness)
        else:
            return self._grade_single_enhanced(submission_text, file_metadata, student_name, rubric, strictness)
    
    async def _grade_multi_agent(self, submission_text: str, file_metadata: Dict, 
                               student_name: str, rubric: Optional[Dict]) -> Dict[str, Any]:
        """Grade using multi-agent."""
        if self.multi_agent_service is None:
            self.multi_agent_service = MultiAgentGradingService(self.api_key)
        
        consensus_result = await self.multi_agent_service.grade_submission_multi_agent(
            submission_text=submission_text,
            file_metadata=file_metadata,
            rubric=rubric,
            student_name=student_name
        )
        
        # Convert ConsensusResult to dictionary format
        return self.multi_agent_service.consensus_result_to_grading_result(
            consensus_result, student_name
        )
    
    def _grade_single_code(self, submission_text: str, file_metadata: Dict, student_name: str,
                          rubric: Optional[Dict], strictness: float) -> Dict[str, Any]:
        """Grade using single agent code approach."""
        return self.grading_service.grade_code_submission(
            submission_text=submission_text,
            file_metadata=file_metadata,
            student_name=student_name,
            rubric=rubric,
            strictness=strictness
        )
    
    def _grade_single_enhanced(self, submission_text: str, file_metadata: Dict, student_name: str,
                             rubric: Optional[Dict], strictness: float) -> Dict[str, Any]:
        """Grade using enhanced single agent."""
        return self.grading_service.grade_enhanced_submission(
            submission_text=submission_text,
            file_metadata=file_metadata,
            student_name=student_name,
            rubric=rubric,
            strictness=strictness
        )
    
    async def _fallback_grading(self, file_paths: List[Path], student_name: str,
                              rubric: Optional[Dict], strictness: float, error: str) -> Dict[str, Any]:
        """Fallback when routing fails."""
        logger.warning(f"Using fallback: {error}")
        
        try:
            if file_paths and file_paths[0].exists():
                analysis = self.document_processor.process_file(file_paths[0])
                file_metadata = {"file_type": "fallback", "error": error}
                
                return self.grading_service.grade_enhanced_submission(
                    submission_text=analysis.get("content", "Error reading file"),
                    file_metadata=file_metadata,
                    student_name=student_name,
                    rubric=rubric,
                    strictness=strictness
                )
        except Exception as e:
            logger.error(f"Fallback failed: {e}")
        
        # Last resort
        return {
            "student_name": student_name,
            "score": 0,
            "max_score": 100,
            "feedback": f"Error processing submission: {error}",
            "error": True
        } 