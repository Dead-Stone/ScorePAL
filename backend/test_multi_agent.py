"""
Test Multi-Agent Grading System

Simple test to verify the multi-agent grading functionality works correctly.
"""

import asyncio
import logging
import os
from multi_agent_grading import MultiAgentGradingService

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_multi_agent_grading():
    """Test the multi-agent grading system with a sample submission."""
    
    # Sample submission (Python code)
    submission_text = """
def fibonacci(n):
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)

# Test the function
for i in range(10):
    print(f"fibonacci({i}) = {fibonacci(i)}")
"""
    
    # Sample file metadata
    file_metadata = {
        "file_type": "code",
        "language": "python",
        "filename": "fibonacci.py",
        "line_count": 8,
        "function_count": 1
    }
    
    # Sample rubric
    rubric = {
        "criteria": [
            {
                "name": "Correctness & Functionality",
                "max_points": 40,
                "description": "Code works correctly and handles edge cases"
            },
            {
                "name": "Code Quality & Style",
                "max_points": 30,
                "description": "Clean, readable code following best practices"
            },
            {
                "name": "Documentation",
                "max_points": 20,
                "description": "Appropriate comments and documentation"
            },
            {
                "name": "Efficiency",
                "max_points": 10,
                "description": "Efficient algorithm implementation"
            }
        ],
        "total_points": 100
    }
    
    try:
        # Initialize multi-agent service
        api_key = os.getenv("GEMINI_API_KEY", "dummy_key")
        multi_agent_service = MultiAgentGradingService(api_key)
        
        print("🚀 Starting Multi-Agent Grading Test")
        print("=" * 60)
        
        # Grade with multi-agent system
        result = await multi_agent_service.grade_submission_multi_agent(
            submission_text=submission_text,
            file_metadata=file_metadata,
            rubric=rubric,
            student_name="TestStudent"
        )
        
        print("\n✅ Multi-Agent Grading Results:")
        print("=" * 60)
        print(f"Student: {result['student_name']}")
        print(f"Final Score: {result['score']:.1f}/{result['max_score']:.1f} ({result['percentage']:.1f}%)")
        print(f"Grade Letter: {result['grade_letter']}")
        print(f"Consensus Confidence: {result['multi_agent_analysis']['consensus_confidence']:.2f}")
        print(f"Agreement Level: {result['multi_agent_analysis']['agreement_level']}")
        print(f"Consensus Method: {result['multi_agent_analysis']['consensus_method']}")
        print(f"Processing Time: {result['multi_agent_analysis']['total_processing_time']:.2f}s")
        
        print("\n📊 Individual Agent Scores:")
        print("-" * 40)
        for agent_score in result['multi_agent_analysis']['individual_scores']:
            print(f"{agent_score['agent']} ({agent_score['role']}): {agent_score['score']:.1f} (confidence: {agent_score['confidence']:.2f})")
        
        print("\n💬 Consensus Feedback:")
        print("-" * 40)
        print(result['feedback'][:500] + "..." if len(result['feedback']) > 500 else result['feedback'])
        
        print("\n🎯 Criteria Breakdown:")
        print("-" * 40)
        for criterion in result['criteria_scores']:
            print(f"{criterion['name']}: {criterion['points']:.1f}/{criterion['max_points']} points")
        
        print("\n📈 Accuracy Metrics:")
        print("-" * 40)
        accuracy = result['accuracy_metrics']
        print(f"Overall Confidence: {accuracy['overall_confidence']:.2f}")
        print(f"Mathematical Accuracy: {accuracy['mathematical_accuracy']:.2f}")
        print(f"Feedback Quality: {accuracy['feedback_quality']:.2f}")
        print(f"Accuracy Level: {accuracy['accuracy_level']}")
        
        print("\n🎉 Multi-Agent Test Completed Successfully!")
        
    except Exception as e:
        print(f"❌ Multi-Agent Test Failed: {e}")
        logger.error(f"Test error: {e}", exc_info=True)


def run_test():
    """Run the multi-agent test."""
    print("Multi-Agent Grading System Test")
    print("=" * 60)
    print("Testing three-layer AI agent analysis...")
    
    # Run the async test
    asyncio.run(test_multi_agent_grading())


if __name__ == "__main__":
    run_test() 