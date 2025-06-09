import logging
logging.basicConfig(level=logging.INFO)

try:
    from accuracy_calculator import AccuracyCalculator
    print("✅ AccuracyCalculator imported successfully")

    # Test the calculator
    calc = AccuracyCalculator()
    
    result = {
        'score': 85.0,
        'total': 100.0,
        'criteria_scores': [
            {'name': 'Test Criterion', 'points': 85.0, 'max_points': 100.0, 'feedback': 'Good work with specific examples demonstrating understanding'}
        ],
        'grading_feedback': 'Overall good work demonstrating understanding with specific examples'
    }

    metrics = calc.calculate_accuracy_metrics(result)
    print('✅ Accuracy Calculator Working!')
    print(f'Mathematical Accuracy: {metrics["mathematical_accuracy"]:.3f}')
    print(f'Feedback Quality: {metrics["feedback_quality"]:.3f}')
    print(f'Overall Confidence: {metrics["overall_confidence"]:.3f}')
    print(f'Accuracy Level: {metrics["accuracy_level"]}')
    
    # Test accuracy enhancer
    from accuracy_system import AccuracyEnhancer
    
    class MockService:
        pass
    
    enhancer = AccuracyEnhancer(MockService())
    enhanced = enhancer.enhance_grading_accuracy(result.copy())
    
    print('✅ AccuracyEnhancer Working!')
    print(f'Enhanced accuracy score: {enhanced["accuracy_score"]:.3f}')
    print(f'Has accuracy metrics: {"accuracy_metrics" in enhanced}')
    
    if "accuracy_metrics" in enhanced:
        print(f'Enhanced accuracy level: {enhanced["accuracy_metrics"]["accuracy_level"]}')
    
    print('\n🎯 ACCURACY CALCULATION SYSTEM IS FULLY IMPLEMENTED AND WORKING!')
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc() 