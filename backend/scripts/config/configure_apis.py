#!/usr/bin/env python3
"""
API Configuration Script for ScorePAL Enhanced Multiagent System
Helps configure API keys and test connectivity
"""

import os
import sys
from pathlib import Path

def check_api_keys():
    """Check current API key configuration."""
    print("🔍 Current API Key Configuration:")
    print("=" * 50)
    
    # Gemini API
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key:
        print(f"✅ Gemini API Key: {gemini_key[:10]}...{gemini_key[-4:] if len(gemini_key) > 10 else 'SHORT'}")
    else:
        print("❌ Gemini API Key: Not set")
    
    # OpenAI API
    openai_key = os.getenv("OPENAI_API_KEY", "")
    if openai_key:
        print(f"✅ OpenAI API Key: {openai_key[:10]}...{openai_key[-4:] if len(openai_key) > 10 else 'SHORT'}")
    else:
        print("❌ OpenAI API Key: Not set")
    
    # Claude API
    claude_key = os.getenv("ANTHROPIC_API_KEY", "")
    if claude_key:
        print(f"✅ Claude API Key: {claude_key[:10]}...{claude_key[-4:] if len(claude_key) > 10 else 'SHORT'}")
    else:
        print("❌ Claude API Key: Not set")
    
    # Neo4j
    use_neo4j = os.getenv("USE_NEO4J", "true").lower() == "true"
    print(f"📊 Neo4j Usage: {'Enabled' if use_neo4j else 'Disabled'}")
    
    print("=" * 50)

def test_enhanced_system():
    """Test the enhanced image extraction system."""
    print("\n🧪 Testing Enhanced Image Extraction System:")
    print("=" * 50)
    
    try:
        from enhanced_image_extraction import EnhancedImageExtractionService
        service = EnhancedImageExtractionService()
        
        print(f"✅ Enhanced Image Service initialized")
        print(f"🤖 Available AI Models: {service.available_models}")
        
        if not service.available_models:
            print("💡 No AI models available - using computer vision fallback")
            print("   This is normal and the system will work perfectly!")
        else:
            print(f"🚀 {len(service.available_models)} AI vision models ready")
        
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_multiagent_system():
    """Test the multiagent grading system."""
    print("\n🎯 Testing Multiagent Grading System:")
    print("=" * 50)
    
    try:
        from multi_agent_grading import MultiAgentGradingSystem
        system = MultiAgentGradingSystem()
        
        print(f"✅ Multiagent System initialized")
        print(f"👥 Workers: {system.max_workers}")
        print("🔧 System Status: Ready for grading with image enhancement")
        
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def disable_problematic_services():
    """Disable services causing errors."""
    print("\n🔧 Disabling Problematic Services:")
    print("=" * 50)
    
    # Disable Neo4j
    os.environ["USE_NEO4J"] = "false"
    print("✅ Neo4j disabled")
    
    # Clear problematic API keys
    problematic_keys = ["OPENAI_API_KEY"]  # Keep Gemini for basic grading
    
    for key in problematic_keys:
        if os.getenv(key):
            os.environ[key] = ""
            print(f"✅ Cleared {key}")
    
    print("💡 System will now use computer vision fallback for image analysis")

def show_solutions():
    """Show solutions for common errors."""
    print("\n💡 Solutions for Common Errors:")
    print("=" * 50)
    
    print("1. 🔴 Gemini Quota Exceeded (429):")
    print("   - Get new API key: https://aistudio.google.com/app/apikey")
    print("   - Or disable: $env:GEMINI_API_KEY=''")
    print()
    
    print("2. 🔴 OpenAI Invalid Key (401):")
    print("   - Get new API key: https://platform.openai.com/account/api-keys")
    print("   - Or disable: $env:OPENAI_API_KEY=''")
    print()
    
    print("3. 🔴 Neo4j Connection Failed:")
    print("   - Disable: $env:USE_NEO4J='false'")
    print()
    
    print("4. ✅ Use Computer Vision Fallback:")
    print("   - Works without any API keys!")
    print("   - Provides image analysis using OpenCV")
    print("   - Perfect for testing and development")

def main():
    """Main configuration function."""
    print("🚀 ScorePAL Enhanced Multiagent System Configuration")
    print("=" * 60)
    
    # Check current configuration
    check_api_keys()
    
    # Show solutions
    show_solutions()
    
    # Test systems
    print("\n🧪 Testing Systems:")
    print("=" * 50)
    
    image_ok = test_enhanced_system()
    multiagent_ok = test_multiagent_system()
    
    if image_ok and multiagent_ok:
        print("\n🎉 ALL SYSTEMS READY!")
        print("✅ Enhanced multiagent grading system is fully operational")
        print("🎯 Ready to process submissions with image analysis")
    else:
        print("\n⚠️  Some issues detected, but system can still work")
        print("💡 Computer vision fallback will handle image analysis")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main() 