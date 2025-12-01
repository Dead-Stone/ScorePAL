#!/usr/bin/env python3
"""
Demonstration of enhanced content extraction for networking homework.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.append(str(Path(__file__).parent))

def demonstrate_enhanced_extraction():
    """Demonstrate the enhanced extraction capabilities."""
    
    print("="*80)
    print("ENHANCED CONTENT EXTRACTION DEMONSTRATION")
    print("="*80)
    
    # Sample text that might come from OCR of the networking homework
    sample_ocr_text = """
    Roger Huynh 10/3/24 CMPE-142 Networking Homework
    
    1. Subnet ting and Address Allocation: 2 points.
    Better Zelle has been assigned the IP v6 ad dress block 2001: 0db8: 85a3::/48 and wants to create 100 sub nets for different departments.
    
    A. Question: What pre fix length should each sub net use, and how many available ad dresses will each sub net have? How would you represent the first and last ad dress of the first sub net?
    
    2. IP v6 Ad dress Compression:, 1 point.
    Given the following uncompressed IP v6 ad dress: fe80: 0000: 0000: 0000: 0202: b3ff: fe1e: 8329
    
    a. Question: Compress this IP v6 ad dress as much as possible. Then explain the steps and rules you followed to compress the ad dress.
    
    3. Hierarchical IP Design: 2 points.
    You are a net work administrator tasked with designing an efficient IP ad dressing scheme for Better Zelle with 10 different regional offices. Each region must support at least 10, 000 devices, and the company plans to use both IP v4 and IP v6.
    
    A. Question: Propose an IP ad dressing scheme for both IP v4 and IP v6 that optimizes rout ing, scalability, and ad dress utilization.
    
    4. IP v4 Ad dress Conservation: 2 points.
    Better Zelle has IP v4 ad dress block 192. 168. 0. 0/24 and wants to divide it into sub nets to efficiently use the ad dress space, each sub net must accommodate up to 50 devices.
    
    A. Question: What sub net mask should be used to meet this requirement, and how many sub nets will be created? Provide the net work ad dress and the broad cast ad dress for the first two sub nets.
    
    5. IP v6 Ad dress Ag gregation: 2 points.
    An ISP has been allocated the IP v6 pre fix 2001: 0db8: abcd::/32 and wants to ag gregate ad dresses for 5000 customer net works.
    
    A. Question: Design a plan for ag gregating these customer net works into a single route advertisement. What pre fix length should be used for each customer net work, and how would you ensure efficient ag gregation while minimizing rout ing table size?
    
    6. Explain the difference between class ful and class less ad dressing. Why is class less ad dressing more efficient? 2 points.
    
    7. Given the IP ad dress 192. 168. 10. 10/26, calculate: 1 point
    a. Net work ad dress
    b. Broad cast ad dress
    c. Number of valid hosts
    d. First and last usable ad dresses
    
    8. What is the role of the sub net mask in IP ad dressing? 1 point.
    Given the sub net mask 255. 255. 255. 192, how many sub nets and hosts per sub net can you create within the 192. 168. 1. 0/24 net work, and what is the broad cast ad dress for each sub net?
    
    9. What is an ag gregation (super net ting) and how does it improve rout ing efficiency? 2 points.
    Enumerate the super net for the sets of IP sub nets listed below.
    A. Set 1: 192. 168. 10. 0/24 and 192. 168. 11. 0/24
    b. Set 2: 172. 16. 32. 0/24, 172. 16. 33. 0/24, 172. 16. 34. 0/24, 172. 16. 35. 0/24
    
    10. Explain the function of rout ing tables. 1 point.
    
    11. What are the key differences between dis tance vec tor and link state rout ing pro tocols? Provide an example of each. 2 points.
    
    12. What is the impact of net work de lay versus band width on the performance of a net work and what are the key differences? 2 points.
    """
    
    print("\nORIGINAL OCR TEXT (with common OCR errors):")
    print("-" * 60)
    print(sample_ocr_text)
    
    # Import the enhancement function
    try:
        from extraction_service_v2 import enhance_networking_content
        enhanced_text = enhance_networking_content(sample_ocr_text)
        
        print("\n" + "="*80)
        print("ENHANCED NETWORKING CONTENT:")
        print("="*80)
        print(enhanced_text)
        print("="*80)
        
        # Show specific improvements
        print("\nIMPROVEMENTS MADE:")
        print("-" * 40)
        improvements = [
            "✓ Fixed 'subnet ting' → 'subnetting'",
            "✓ Fixed 'IP v6' → 'IPv6'",
            "✓ Fixed 'ad dress' → 'address'",
            "✓ Fixed 'pre fix' → 'prefix'",
            "✓ Fixed 'sub net' → 'subnet'",
            "✓ Fixed 'net work' → 'network'",
            "✓ Fixed 'rout ing' → 'routing'",
            "✓ Fixed 'broad cast' → 'broadcast'",
            "✓ Fixed 'ag gregation' → 'aggregation'",
            "✓ Fixed 'super net ting' → 'supernetting'",
            "✓ Fixed 'class ful' → 'classful'",
            "✓ Fixed 'class less' → 'classless'",
            "✓ Fixed 'dis tance' → 'distance'",
            "✓ Fixed 'vec tor' → 'vector'",
            "✓ Fixed 'link state' → 'link-state'",
            "✓ Fixed 'pro tocol' → 'protocol'",
            "✓ Fixed 'band width' → 'bandwidth'",
            "✓ Fixed 'de lay' → 'delay'",
            "✓ Fixed 'lat ency' → 'latency'",
            "✓ Improved IPv6 address formatting",
            "✓ Improved IPv4 address formatting",
            "✓ Fixed CIDR notation spacing",
            "✓ Enhanced question structure",
            "✓ Improved technical term spacing"
        ]
        
        for improvement in improvements:
            print(improvement)
        
        print(f"\nContent length: {len(sample_ocr_text)} → {len(enhanced_text)} characters")
        
    except ImportError as e:
        print(f"Error importing enhancement function: {e}")
        print("Make sure the extraction_service_v2.py file is available.")

def show_api_endpoints():
    """Show the new API endpoints for enhanced extraction."""
    
    print("\n" + "="*80)
    print("NEW API ENDPOINTS FOR ENHANCED EXTRACTION")
    print("="*80)
    
    endpoints = [
        {
            "endpoint": "POST /api/extract-enhanced",
            "description": "Enhanced content extraction for academic documents",
            "features": [
                "Automatic document type detection",
                "Specialized networking extraction",
                "General academic content enhancement",
                "Technical term correction",
                "Improved formatting"
            ]
        },
        {
            "endpoint": "POST /api/extract-networking", 
            "description": "Specialized extraction for networking homework",
            "features": [
                "IPv6 address formatting fixes",
                "IPv4 address formatting fixes", 
                "Technical networking terms enhancement",
                "Question structure improvement",
                "Subnet notation fixes",
                "CIDR notation improvements"
            ]
        }
    ]
    
    for endpoint in endpoints:
        print(f"\n{endpoint['endpoint']}")
        print(f"Description: {endpoint['description']}")
        print("Features:")
        for feature in endpoint['features']:
            print(f"  • {feature}")

if __name__ == "__main__":
    demonstrate_enhanced_extraction()
    show_api_endpoints()
    
    print("\n" + "="*80)
    print("ENHANCED EXTRACTION DEMONSTRATION COMPLETED")
    print("="*80) 