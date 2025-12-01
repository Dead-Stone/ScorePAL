#!/usr/bin/env python3
"""
Simple test to check environment variables.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("="*50)
print("ENVIRONMENT VARIABLES TEST")
print("="*50)

# Check for Gemini API key
gemini_key = os.getenv('GEMINI_API_KEY')
if gemini_key:
    print(f"✓ GEMINI_API_KEY found: {gemini_key[:10]}...{gemini_key[-4:]}")
else:
    print("❌ GEMINI_API_KEY not found")

# Check for other environment variables
env_vars = [
    'BACKEND_URL',
    'NEXT_PUBLIC_API_URL',
    'NEO4J_URI',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY'
]

print("\nOther environment variables:")
for var in env_vars:
    value = os.getenv(var)
    if value:
        print(f"  ✓ {var}: {value[:20]}..." if len(value) > 20 else f"  ✓ {var}: {value}")
    else:
        print(f"  - {var}: Not set")

print("\n" + "="*50) 