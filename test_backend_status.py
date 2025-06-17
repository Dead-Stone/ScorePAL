#!/usr/bin/env python3
"""
Test script to demonstrate the backend status indicator
"""

import requests
import json
import time

def test_backend_status():
    """Test the backend status endpoint"""
    try:
        # Test the health endpoint
        response = requests.get("https://34-13-75-235.nip.io/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Backend Status Response:")
            print(json.dumps(data, indent=2))
            
            # Demonstrate different status scenarios
            status = data.get('status', 'unknown')
            print(f"\n🎯 Status: {status.upper()}")
            
            if status == 'healthy':
                print("🟢 Backend is running smoothly")
            elif status == 'warning':
                print("🟡 Backend has some issues but is functional")
            elif status == 'error':
                print("🔴 Backend has critical issues")
            else:
                print("⚪ Backend status unknown")
                
            # Show key metrics
            print(f"\n📊 Key Metrics:")
            print(f"   • Response Time: {data.get('response_time_ms', 'N/A')}ms")
            print(f"   • Uptime: {data.get('uptime', 'N/A')}")
            print(f"   • Version: {data.get('version', 'N/A')}")
            
            # Show endpoint status
            endpoints = data.get('endpoints', {})
            print(f"\n🔌 API Endpoints:")
            for endpoint, status in endpoints.items():
                icon = "✅" if status else "❌"
                print(f"   {icon} {endpoint}")
                
        else:
            print(f"❌ Backend returned status code: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("🔴 Backend is offline - Connection refused")
    except requests.exceptions.Timeout:
        print("🟡 Backend is slow - Request timed out")
    except Exception as e:
        print(f"❌ Error testing backend: {e}")

if __name__ == "__main__":
    print("🔍 Testing Backend Status Endpoint...")
    print("=" * 50)
    test_backend_status()
    print("=" * 50)
    print("💡 In the frontend, this will appear as a colored status button!") 