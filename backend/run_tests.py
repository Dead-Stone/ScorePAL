#!/usr/bin/env python3
"""
Regression Test Runner for GA_Agentic_v2 Backend

This script runs comprehensive regression tests for the single grading functionality,
including file processing, grading services, API endpoints, and end-to-end workflows.

Usage:
    python run_tests.py [options]

Options:
    --unit          Run only unit tests
    --integration   Run only integration tests
    --regression    Run only regression tests
    --slow          Include slow tests
    --verbose       Verbose output
    --coverage      Generate coverage report
    --html          Generate HTML coverage report
"""

import sys
import subprocess
import argparse
from pathlib import Path
import time

def run_command(cmd, description=""):
    """Run a command and return success status."""
    print(f"\n{'='*60}")
    if description:
        print(f"Running: {description}")
    print(f"Command: {' '.join(cmd)}")
    print('='*60)
    
    start_time = time.time()
    result = subprocess.run(cmd, capture_output=True, text=True)
    end_time = time.time()
    
    print(f"Duration: {end_time - start_time:.2f} seconds")
    
    if result.stdout:
        print("STDOUT:")
        print(result.stdout)
    
    if result.stderr:
        print("STDERR:")
        print(result.stderr)
    
    return result.returncode == 0

def install_test_dependencies():
    """Install test dependencies if not already installed."""
    print("Checking test dependencies...")
    
    dependencies = [
        "pytest>=7.0.0",
        "pytest-cov>=4.0.0",
        "pytest-html>=3.0.0",
        "pytest-mock>=3.0.0",
        "httpx>=0.24.0",  # For FastAPI testing
    ]
    
    for dep in dependencies:
        try:
            import importlib
            module_name = dep.split('>=')[0].replace('-', '_')
            importlib.import_module(module_name)
            print(f"✓ {dep.split('>=')[0]} is installed")
        except ImportError:
            print(f"Installing {dep}...")
            result = subprocess.run([sys.executable, "-m", "pip", "install", dep], 
                                  capture_output=True, text=True)
            if result.returncode != 0:
                print(f"Failed to install {dep}: {result.stderr}")
                return False
    
    return True

def run_tests(test_type="all", verbose=False, coverage=False, html_coverage=False, slow=False):
    """Run the specified tests."""
    
    # Base pytest command
    cmd = [sys.executable, "-m", "pytest"]
    
    # Add test directory
    cmd.append("tests/")
    
    # Add markers based on test type
    if test_type == "unit":
        cmd.extend(["-m", "unit"])
    elif test_type == "integration":
        cmd.extend(["-m", "integration"])
    elif test_type == "regression":
        cmd.extend(["-m", "regression"])
    
    # Add slow tests if requested
    if slow:
        cmd.extend(["-m", "not slow or slow"])
    else:
        cmd.extend(["-m", "not slow"])
    
    # Add verbosity
    if verbose:
        cmd.append("-v")
    else:
        cmd.append("-q")
    
    # Add coverage
    if coverage:
        cmd.extend(["--cov=.", "--cov-report=term-missing"])
        if html_coverage:
            cmd.extend(["--cov-report=html:htmlcov"])
    
    # Add additional options
    cmd.extend([
        "--tb=short",
        "--strict-markers",
        "-x"  # Stop on first failure
    ])
    
    return run_command(cmd, f"Running {test_type} tests")

def run_specific_test_files():
    """Run tests for specific components."""
    test_files = [
        ("Enhanced File Processor", "tests/test_enhanced_file_processor.py"),
        ("Grading Service", "tests/test_grading_v2.py"),
        ("API Integration", "tests/test_api_integration.py"),
        ("Prompt Generation", "tests/test_prompts.py"),
        ("End-to-End Regression", "tests/test_regression_suite.py")
    ]
    
    results = {}
    for name, file_path in test_files:
        if Path(file_path).exists():
            cmd = [sys.executable, "-m", "pytest", file_path, "-v"]
            success = run_command(cmd, f"Testing {name}")
            results[name] = success
        else:
            print(f"⚠️  Test file not found: {file_path}")
            results[name] = False
    
    return results

def generate_test_report(results):
    """Generate a test report summary."""
    print(f"\n{'='*60}")
    print("TEST REPORT SUMMARY")
    print('='*60)
    
    total_tests = len(results)
    passed_tests = sum(1 for success in results.values() if success)
    failed_tests = total_tests - passed_tests
    
    for test_name, success in results.items():
        status = "✓ PASSED" if success else "✗ FAILED"
        print(f"{test_name:<30} {status}")
    
    print(f"\n{'-'*60}")
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    if failed_tests == 0:
        print("\n🎉 All tests passed! The system is ready for production.")
    else:
        print(f"\n⚠️  {failed_tests} test(s) failed. Please review the failures above.")
    
    return failed_tests == 0

def main():
    """Main test runner function."""
    parser = argparse.ArgumentParser(description="Run regression tests for GA_Agentic_v2")
    parser.add_argument("--unit", action="store_true", help="Run only unit tests")
    parser.add_argument("--integration", action="store_true", help="Run only integration tests")
    parser.add_argument("--regression", action="store_true", help="Run only regression tests")
    parser.add_argument("--slow", action="store_true", help="Include slow tests")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--coverage", action="store_true", help="Generate coverage report")
    parser.add_argument("--html", action="store_true", help="Generate HTML coverage report")
    parser.add_argument("--component", action="store_true", help="Run tests by component")
    parser.add_argument("--install-deps", action="store_true", help="Install test dependencies")
    
    args = parser.parse_args()
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    import os
    os.chdir(backend_dir)
    
    print("🚀 GA_Agentic_v2 Regression Test Suite")
    print(f"Working directory: {Path.cwd()}")
    
    # Install dependencies if requested
    if args.install_deps:
        if not install_test_dependencies():
            print("Failed to install test dependencies")
            return 1
    
    # Determine test type
    test_type = "all"
    if args.unit:
        test_type = "unit"
    elif args.integration:
        test_type = "integration"
    elif args.regression:
        test_type = "regression"
    
    success = True
    
    if args.component:
        # Run tests by component
        results = run_specific_test_files()
        success = generate_test_report(results)
    else:
        # Run all tests of specified type
        success = run_tests(
            test_type=test_type,
            verbose=args.verbose,
            coverage=args.coverage,
            html_coverage=args.html,
            slow=args.slow
        )
    
    if success:
        print("\n✅ All tests completed successfully!")
        return 0
    else:
        print("\n❌ Some tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 