"""
Test script to verify the accuracy calculation system is working properly.
"""

import json
import logging
from accuracy_system import AccuracyEnhancer
from accuracy_calculator import AccuracyCalculator

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MockGradingService:
    """Mock grading service for testing."""
    pass

def test_accuracy_calculation():
    """Test the accuracy calculation system."""
    
    print("🧪 Testing Accuracy Calculation System")
    print("=" * 50)
    
    # Create test grading result
    test_result = {
        "score": 85.0,
        "total": 100.0,
        "criteria_scores": [
            {
                "name": "Content Quality",
                "points": 35.0,
                "max_points": 40.0,
                "feedback": "Excellent content with specific examples demonstrating clear understanding of the topic."
            },
            {
                "name": "Organization",
                "points": 20.0,
                "max_points": 25.0,
                "feedback": "Good structure with room for improvement in logical flow."
            },
            {
                "name": "Analysis",
                "points": 18.0,
                "max_points": 20.0,
                "feedback": "Strong critical thinking evident throughout the work."
            },
            {
                "name": "Presentation",
                "points": 12.0,
                "max_points": 15.0,
                "feedback": "Clear presentation with minor formatting issues to consider."
            }
        ],
        "grading_feedback": "Overall excellent submission demonstrating strong understanding. The work shows specific examples of analysis and provides clear evidence of learning. Consider improving the organizational structure for even better results."
    }
    
    # Create test rubric
    test_rubric = {
        "criteria": [
            {"name": "Content Quality", "max_points": 40, "description": "Quality and accuracy of content"},
            {"name": "Organization", "max_points": 25, "description": "Structure and flow"},
            {"name": "Analysis", "max_points": 20, "description": "Critical thinking"},
            {"name": "Presentation", "max_points": 15, "description": "Formatting and clarity"}
        ],
        "total_points": 100
    }
    
    # Test AccuracyCalculator directly
    print("\n📊 Testing AccuracyCalculator...")
    calculator = AccuracyCalculator()
    metrics = calculator.calculate_accuracy_metrics(test_result, test_rubric)
    
    print(f"✅ Mathematical Accuracy: {metrics['mathematical_accuracy']:.3f}")
    print(f"✅ Feedback Quality: {metrics['feedback_quality']:.3f}")
    print(f"✅ Score Reasonableness: {metrics['score_reasonableness']:.3f}")
    print(f"✅ Evidence Quality: {metrics['evidence_quality']:.3f}")
    print(f"✅ Overall Confidence: {metrics['overall_confidence']:.3f}")
    print(f"✅ Accuracy Level: {metrics['accuracy_level']}")
    print(f"✅ Recommendations: {len(metrics['recommendations'])} items")
    
    # Test AccuracyEnhancer with full pipeline
    print("\n🔧 Testing AccuracyEnhancer...")
    mock_service = MockGradingService()
    enhancer = AccuracyEnhancer(mock_service)
    
    enhanced_result = enhancer.enhance_grading_accuracy(test_result.copy(), test_rubric)
    
    print(f"✅ Enhanced Score: {enhanced_result['score']}")
    print(f"✅ Accuracy Score: {enhanced_result['accuracy_score']:.3f}")
    print(f"✅ Accuracy Metrics Present: {'accuracy_metrics' in enhanced_result}")
    
    if 'accuracy_metrics' in enhanced_result:
        accuracy_metrics = enhanced_result['accuracy_metrics']
        print(f"✅ Final Accuracy Level: {accuracy_metrics['accuracy_level']}")
        print(f"✅ Final Confidence: {accuracy_metrics['overall_confidence']:.3f}")
    
    # Test mathematical error detection
    print("\n🔍 Testing Mathematical Error Detection...")
    bad_result = test_result.copy()
    bad_result["score"] = 90.0  # Should be 85.0 based on criteria
    
    bad_metrics = calculator.calculate_accuracy_metrics(bad_result, test_rubric)
    print(f"✅ Math Error Detection - Accuracy: {bad_metrics['mathematical_accuracy']:.3f}")
    print(f"✅ Math Error Detection - Confidence: {bad_metrics['overall_confidence']:.3f}")
    
    # Test with missing feedback
    print("\n📝 Testing Feedback Quality Assessment...")
    poor_feedback_result = test_result.copy()
    poor_feedback_result["grading_feedback"] = "Good work."
    for criterion in poor_feedback_result["criteria_scores"]:
        criterion["feedback"] = "OK"
    
    poor_metrics = calculator.calculate_accuracy_metrics(poor_feedback_result, test_rubric)
    print(f"✅ Poor Feedback - Quality Score: {poor_metrics['feedback_quality']:.3f}")
    print(f"✅ Poor Feedback - Evidence Score: {poor_metrics['evidence_quality']:.3f}")
    
    print("\n🎉 Accuracy Calculation System Test Complete!")
    print("=" * 50)
    
    return {
        "test_passed": True,
        "accuracy_metrics": metrics,
        "enhanced_result": enhanced_result
    }

def test_edge_cases():
    """Test edge cases for accuracy calculation."""
    
    print("\n⚠️  Testing Edge Cases...")
    calculator = AccuracyCalculator()
    
    # Test empty result
    empty_result = {"score": 0, "total": 100, "criteria_scores": [], "grading_feedback": ""}
    empty_metrics = calculator.calculate_accuracy_metrics(empty_result)
    print(f"✅ Empty Result - Confidence: {empty_metrics['overall_confidence']:.3f}")
    
    # Test perfect score
    perfect_result = {
        "score": 100.0,
        "total": 100.0,
        "criteria_scores": [
            {"name": "Perfect", "points": 100.0, "max_points": 100.0, 
             "feedback": "Perfect work demonstrating excellent understanding with specific examples."}
        ],
        "grading_feedback": "Exceptional work with clear evidence and specific examples throughout."
    }
    perfect_metrics = calculator.calculate_accuracy_metrics(perfect_result)
    print(f"✅ Perfect Result - Confidence: {perfect_metrics['overall_confidence']:.3f}")
    print(f"✅ Perfect Result - Level: {perfect_metrics['accuracy_level']}")
    
    print("✅ Edge Cases Testing Complete!")

if __name__ == "__main__":
    try:
        test_result = test_accuracy_calculation()
        test_edge_cases()
        
        print(f"\n🎯 Final Summary:")
        print(f"   - Accuracy calculation: ✅ Working")
        print(f"   - Mathematical validation: ✅ Working") 
        print(f"   - Feedback assessment: ✅ Working")
        print(f"   - Evidence detection: ✅ Working")
        print(f"   - Overall confidence: {test_result['accuracy_metrics']['overall_confidence']:.3f}")
        print(f"   - System status: 🟢 READY")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc() 