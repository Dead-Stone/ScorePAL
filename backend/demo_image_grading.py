#!/usr/bin/env python3
"""
Demo: Image Extraction for Grading
Shows how to extract images from student submissions and use AI summaries for grading.
"""

import os
import json
from pathlib import Path
from image_extraction_service import ImageExtractionService

def demo_grading_workflow():
    """Demonstrate the complete grading workflow with image extraction."""
    print("🎓 ScorePAL Image Extraction for Grading Demo")
    print("=" * 60)
    
    # Test file
    test_file = "test_files/huynhroger_4489590_79107742_CMPE-148_ Networking Homework .pdf"
    
    if not os.path.exists(test_file):
        print(f"❌ Test file not found: {test_file}")
        print("Please ensure the test file exists to run the demo.")
        return
    
    print(f"📄 Processing student submission: {Path(test_file).name}")
    print("-" * 60)
    
    # Initialize the service
    service = ImageExtractionService()
    
    # Extract images with grading context
    print("🔍 Step 1: Extracting images from submission...")
    result = service.extract_and_analyze_images(
        test_file,
        context="CMPE-148 Networking homework submission for grading. Focus on technical accuracy, completeness, and presentation quality."
    )
    
    if result.get('error'):
        print(f"❌ Error: {result['error']}")
        return
    
    if not result.get('success'):
        print(f"ℹ️ {result.get('message', 'No images found')}")
        return
    
    print(f"✅ Successfully extracted {result['total_images']} images")
    print(f"📁 Session: {result['session_id']}")
    
    # Analyze each image for grading
    print(f"\n📊 Step 2: Analyzing images for grading...")
    print("-" * 60)
    
    total_score = 0
    max_score = result['total_images'] * 10  # 10 points per image max
    
    for i, img in enumerate(result['images']):
        print(f"\n🖼️ Image {i+1} (Page {img['page_number']}):")
        print(f"   📏 Size: {img['width']}x{img['height']} pixels")
        
        # Analyze the summary for grading criteria
        summary = img['summary']
        score = analyze_image_for_grading(summary, i+1)
        total_score += score
        
        print(f"   📝 Summary Preview: {summary[:200]}...")
        print(f"   🎯 Score: {score}/10 points")
        
        # Show grading criteria
        show_grading_analysis(summary)
    
    # Calculate final grade
    percentage = (total_score / max_score) * 100
    letter_grade = get_letter_grade(percentage)
    
    print(f"\n📈 Step 3: Final Grading Results")
    print("=" * 60)
    print(f"📊 Total Score: {total_score}/{max_score} points")
    print(f"📈 Percentage: {percentage:.1f}%")
    print(f"🎓 Letter Grade: {letter_grade}")
    
    # Show detailed feedback
    print(f"\n📝 Step 4: Detailed Feedback")
    print("-" * 60)
    show_detailed_feedback(result)
    
    # Show data organization
    print(f"\n📁 Step 5: Data Organization")
    print("-" * 60)
    show_data_organization(result['extraction_location'])

def analyze_image_for_grading(summary: str, image_num: int) -> int:
    """Analyze an image summary and assign a score based on grading criteria."""
    score = 0
    
    # Check for technical content (3 points)
    technical_keywords = ['calculation', 'formula', 'equation', 'diagram', 'network', 'subnet', 'binary', 'address']
    if any(keyword in summary.lower() for keyword in technical_keywords):
        score += 3
    
    # Check for completeness (3 points)
    completeness_indicators = ['complete', 'detailed', 'thorough', 'comprehensive']
    if any(indicator in summary.lower() for indicator in completeness_indicators):
        score += 3
    elif 'incomplete' not in summary.lower():
        score += 2  # Partial credit
    
    # Check for clarity and presentation (2 points)
    if 'clear' in summary.lower() or 'legible' in summary.lower():
        score += 2
    elif 'unclear' not in summary.lower() and 'messy' not in summary.lower():
        score += 1  # Partial credit
    
    # Check for accuracy indicators (2 points)
    if 'correct' in summary.lower() or 'accurate' in summary.lower():
        score += 2
    elif 'error' not in summary.lower() and 'incorrect' not in summary.lower():
        score += 1  # Partial credit
    
    return min(score, 10)  # Cap at 10 points

def get_letter_grade(percentage: float) -> str:
    """Convert percentage to letter grade."""
    if percentage >= 90:
        return "A"
    elif percentage >= 80:
        return "B"
    elif percentage >= 70:
        return "C"
    elif percentage >= 60:
        return "D"
    else:
        return "F"

def show_grading_analysis(summary: str):
    """Show detailed grading analysis for an image."""
    print("   📋 Grading Analysis:")
    
    # Technical content
    technical_keywords = ['calculation', 'formula', 'equation', 'diagram', 'network', 'subnet', 'binary']
    tech_found = [kw for kw in technical_keywords if kw in summary.lower()]
    if tech_found:
        print(f"      ✅ Technical Content: {', '.join(tech_found)}")
    else:
        print("      ⚠️ Technical Content: Limited technical elements detected")
    
    # Quality indicators
    if 'clear' in summary.lower():
        print("      ✅ Clarity: Good presentation quality")
    elif 'unclear' in summary.lower() or 'messy' in summary.lower():
        print("      ❌ Clarity: Presentation needs improvement")
    else:
        print("      ⚠️ Clarity: Moderate presentation quality")
    
    # Completeness
    if 'complete' in summary.lower():
        print("      ✅ Completeness: Work appears complete")
    elif 'incomplete' in summary.lower():
        print("      ❌ Completeness: Work appears incomplete")
    else:
        print("      ⚠️ Completeness: Partial work detected")

def show_detailed_feedback(result: dict):
    """Show detailed feedback for the instructor."""
    print("📝 Instructor Feedback Summary:")
    print(f"   • Total images analyzed: {result['total_images']}")
    print(f"   • Session ID: {result['session_id']}")
    print(f"   • All images and summaries saved for review")
    print(f"   • AI analysis focused on technical accuracy and presentation")
    print(f"   • Detailed summaries available for each image")
    print(f"   • Recommended for manual review of complex calculations")

def show_data_organization(extraction_location: str):
    """Show how the data is organized for grading purposes."""
    if not extraction_location:
        print("   No extraction location available")
        return
    
    print(f"📁 Grading Data Organization:")
    print(f"   📂 Base Location: {extraction_location}")
    
    try:
        base_path = Path(extraction_location)
        if base_path.exists():
            print(f"   📁 images/ - All extracted images for visual review")
            print(f"   📁 summaries/ - AI analysis for each image")
            print(f"   📄 metadata.json - Complete extraction details")
            print(f"   📄 extraction_report.txt - Comprehensive grading report")
            
            # Show file counts
            images_dir = base_path / "images"
            summaries_dir = base_path / "summaries"
            
            if images_dir.exists():
                image_count = len(list(images_dir.glob("*.png")))
                print(f"   📊 {image_count} image files ready for review")
            
            if summaries_dir.exists():
                summary_count = len(list(summaries_dir.glob("*.txt")))
                print(f"   📊 {summary_count} AI summaries for grading assistance")
        
    except Exception as e:
        print(f"   Error accessing data: {e}")

def main():
    """Run the grading demo."""
    try:
        demo_grading_workflow()
        
        print(f"\n🎯 Demo Complete!")
        print("=" * 60)
        print("Key Benefits for Grading:")
        print("• ✅ Automatic image extraction from student submissions")
        print("• 🤖 AI-powered analysis of each image for grading context")
        print("• 📁 Organized storage of all images and summaries")
        print("• 📊 Detailed metadata for grading workflow integration")
        print("• 🎓 Scalable solution for large class sizes")
        print("• 💾 Persistent storage for grade appeals and reviews")
        
    except Exception as e:
        print(f"\n❌ Demo failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 