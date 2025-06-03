import os
import json
import re
import logging
import time
from datetime import datetime
from typing import Dict, Any, Optional, List, Union

import requests
from requests.exceptions import RequestException, ConnectionError
from prompts.grading_prompt import get_grading_prompt
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Configure API keys from environment
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
HF_TOKEN = os.environ.get("HF_TOKEN")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
logger.info(f"Environment variables loaded. {GEMINI_API_KEY}")
# Add this at the top of the file with other imports
from threading import Lock
import time

# Add these variables at the top level after other global variables
# Gemini rate limiting
GEMINI_LAST_CALL_TIME = 0
GEMINI_CALL_INTERVAL = 4  # seconds between Gemini API calls
GEMINI_LOCK = Lock()  # Thread safety for multi-threaded access

# API endpoints - updated endpoints for our three models
# Mistral endpoint (instruction-tuned)
HF_MISTRAL_URL = "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.3/v1/chat/completions"
# BLOOM endpoint (using a smaller variant for faster inference)
HF_BLOOM_URL = "https://api-inference.huggingface.co/models/bigscience/bloom-560m"
# Flan-T5 endpoint
HF_FLAN_T5_URL = "https://api-inference.huggingface.co/models/google/flan-t5-large"

# Configure headers for different APIs
HEADERS_MISTRAL = {"Authorization": f"Bearer {HF_MISTRAL_URL}"}
HEADERS_BLOOM = {"Authorization": f"Bearer {HF_BLOOM_URL}"}
HEADERS_FLAN_T5 = {"Authorization": f"Bearer {HF_FLAN_T5_URL}"}

# Global flag to track network availability
NETWORK_AVAILABLE = True

def _extract_json_snippet(text: str) -> Optional[str]:
    """
    Extract a JSON object from text using multiple strategies.
    Returns the first valid JSON object found or None.
    """
    if not text:
        return None
        
    # Strategy 1: Use regex to find JSON patterns
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        return json_match.group(0)
    
    # Strategy 2: Look for code blocks with JSON
    code_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if code_match:
        return code_match.group(1)
    
    # Strategy 3: Manual bracket matching (more reliable for nested structures)
    start = text.find("{")
    if start < 0:
        return None
    
    brace = 0
    for i, ch in enumerate(text[start:], start):
        if ch == "{":
            brace += 1
        elif ch == "}":
            brace -= 1
            if brace == 0:
                return text[start : i + 1]
    return None


def grade_submission(
    question_text: str, 
    submission_text: str, 
    answer_key: str, 
    rubric: Dict[str, Any], 
    strictness_level: int = 3
) -> Dict[str, Any]:
    """
    Grade a submission using the best available model.
    
    Args:
        question_text: The question text
        submission_text: Student's submission
        answer_key: Reference answer or grading key
        rubric: Grading rubric
        strictness_level: How strict to be (1-5)
    
    Returns:
        Grading results as dictionary
    """
    global NETWORK_AVAILABLE
    logger.info("Grading submission...")
    logger.info(f"Network available: {NETWORK_AVAILABLE}")
    # First check if we have network connectivity
    if not NETWORK_AVAILABLE:
        logger.warning("Network appears to be down, using offline grading")
        return _create_simple_grading_result(submission_text, rubric)
    
    # Try different models in order of preference
    try:
        logger.info("Starting grading process")
        # First try Gemini if available (most reliable)
        logger.info(f"Gemini API key: {GEMINI_API_KEY}")
        logger.info(f"Network available: {NETWORK_AVAILABLE}")
        
        # Replace the Gemini part of grade_submission with this improved version
        if GEMINI_API_KEY and NETWORK_AVAILABLE:
            logger.info("Gemini API key found, attempting to use Gemini model")
            try:
                import google.generativeai as genai
                
                # Apply rate limiting for Gemini API
                global GEMINI_LAST_CALL_TIME
                with GEMINI_LOCK:
                    current_time = time.time()
                    elapsed = current_time - GEMINI_LAST_CALL_TIME
                    
                    # Wait if we're calling the API too quickly
                    if elapsed < GEMINI_CALL_INTERVAL:
                        wait_time = GEMINI_CALL_INTERVAL - elapsed
                        logger.info(f"Rate limiting: waiting {wait_time:.2f}s before Gemini API call")
                        time.sleep(wait_time)
                    
                    # Configure and make the API call
                    genai.configure(api_key=GEMINI_API_KEY)
                    MODEL = genai.GenerativeModel("gemini-2.0-flash")  # Use a reliable model version
                    
                    prompt = get_grading_prompt(question_text, answer_key, submission_text, rubric, strictness_level)
                    
                    # Record start time of API call
                    call_start = time.time()
                    response = MODEL.generate_content(prompt)
                    GEMINI_LAST_CALL_TIME = time.time()
                    
                    call_duration = GEMINI_LAST_CALL_TIME - call_start
                    logger.info(f"Gemini API call took {call_duration:.2f}s")
                    
                    # Process the response
                    logger.info("Grading with Gemini model")
                    
                    # Extract JSON from response
                    json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
                    if json_match:
                        json_content = json_match.group(0)
                        try:
                            response_data = json.loads(json_content)
                            result = {
                                'score': float(response_data.get('score', 0)),
                                'total': float(response_data.get('total', rubric.get("max_score", 100))),
                                'mistakes': response_data.get('mistakes', {}),
                                'grading_feedback': response_data.get('grading_feedback', "No feedback provided."),
                                'model_used': 'gemini'
                            }
                            return result
                        except json.JSONDecodeError:
                            logger.warning("Failed to parse JSON from Gemini response, trying to clean it up")
                            try:
                                # Try to fix common JSON issues
                                fixed_json = json_content.replace("'", '"').replace("None", "null")
                                fixed_json = fixed_json.replace("True", "true").replace("False", "false")
                                response_data = json.loads(fixed_json)
                                
                                result = {
                                    'score': float(response_data.get('score', 0)),
                                    'total': float(response_data.get('total', rubric.get("max_score", 100))),
                                    'mistakes': response_data.get('mistakes', {}),
                                    'grading_feedback': response_data.get('grading_feedback', "No feedback provided."),
                                    'model_used': 'gemini'
                                }
                                return result
                            except:
                                logger.error("Failed to parse JSON even after cleanup")
                                # Continue to next model
            except ImportError:
                logger.warning("Google Generative AI library not installed. Skipping Gemini.")
            except Exception as e:
                logger.warning(f"Gemini grading failed: {e}. Trying next model.")
        # Try with direct API access if available
        if HF_TOKEN and NETWORK_AVAILABLE:
            try:
                # Check network connectivity with a simple request
                test_response = requests.get("https://huggingface.co", timeout=5)
                test_response.raise_for_status()
                
                # First try Mistral
                try:
                    result = grade_with_mistral(question_text, submission_text, answer_key, rubric, strictness_level)
                    logger.info("Grading with Mistral model")
                    return result
                except Exception as e:
                    logger.warning(f"Mistral grading failed: {e}. Trying BLOOM model.")
                    
                # Then try BLOOM
                try:
                    result = grade_with_bloom(question_text, submission_text, answer_key, rubric, strictness_level)
                    logger.info("Grading with BLOOM model")
                    return result
                except Exception as e:
                    logger.warning(f"BLOOM grading failed: {e}. Trying Flan-T5 model.")
                    
                # Then try Flan-T5
                try:
                    result = grade_with_flan_t5(question_text, submission_text, answer_key, rubric, strictness_level)
                    logger.info("Grading with Flan-T5 model")
                    return result
                except Exception as e:
                    logger.warning(f"Flan-T5 grading failed: {e}.")
            except (ConnectionError, RequestException) as e:
                logger.error(f"Network connectivity issue: {e}")
                # Mark network as unavailable to avoid further attempts
                NETWORK_AVAILABLE = False
                return _create_simple_grading_result(submission_text, rubric)
        
        # If all models failed, use a simple grading method
        logger.error("All model-based grading methods failed")
        return _create_simple_grading_result(submission_text, rubric)
        
    except Exception as e:
        logger.error(f"Grading error: {e}")
        return _create_error_result()


def grade_with_mistral(
    question_text: str, 
    submission_text: str, 
    answer_key: str, 
    rubric: Dict[str, Any], 
    strictness_level: int = 3
) -> Dict[str, Any]:
    """Grade with Mistral model via Hugging Face."""
    prompt = get_grading_prompt(question_text, answer_key, submission_text, rubric, strictness_level)
    
    # Structure for inference API (chat format for Mistral)
    payload = {
        "inputs": [
            {"role": "system", "content": (
                "You are a grading assistant. Respond only with a JSON object "
                "containing exactly these keys: \"score\", \"total\", \"mistakes\", \"grading_feedback\"."
            )},
            {"role": "user", "content": prompt},
        ],
        "parameters": {
            "max_new_tokens": 1024,
            "temperature": 0.2,
            "return_full_text": False
        }
    }

    try:
        response = requests.post(HF_MISTRAL_URL, headers=HEADERS_MISTRAL, json=payload, timeout=30)
        response.raise_for_status()
        
        try:
            # Handle different response formats
            if isinstance(response.json(), dict) and "generated_text" in response.json():
                response_text = response.json()["generated_text"]
            else:
                response_text = response.json()[0]["generated_text"]
        except Exception as e:
            logger.error(f"Error parsing response: {e}, raw response: {response.text[:200]}...")
            return _create_error_result()
            
        snippet = _extract_json_snippet(response_text)
        if not snippet:
            logger.error(f"No JSON found in response: {response_text[:100]}...")
            return _create_error_result()

        try:
            parsed = json.loads(snippet)
        except json.JSONDecodeError:
            try:
                parsed = json.loads(snippet.replace("'", '"'))
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON snippet: {snippet[:100]}...")
                return _create_error_result()

        return {
            "score": float(parsed.get("score", 0)),
            "total": float(parsed.get("total", rubric.get("max_score", 100))),
            "mistakes": parsed.get("mistakes", {}),
            "grading_feedback": parsed.get("grading_feedback", "No feedback provided."),
        }
    except ConnectionError as e:
        logger.error(f"Connection error with Hugging Face API: {e}")
        global NETWORK_AVAILABLE
        NETWORK_AVAILABLE = False
        raise
    except Exception as e:
        logger.error(f"Error with Mistral grading: {e}")
        raise


def grade_with_bloom(
    question_text: str, 
    submission_text: str, 
    answer_key: str, 
    rubric: Dict[str, Any], 
    strictness_level: int = 3
) -> Dict[str, Any]:
    """Grade with BLOOM model via Hugging Face."""
    prompt = get_grading_prompt(question_text, answer_key, submission_text, rubric, strictness_level)
    
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_length": 1024,
            "temperature": 0.2
        }
    }
    
    try:
        response = requests.post(HF_BLOOM_URL, headers=HEADERS_BLOOM, json=payload, timeout=30)
        response.raise_for_status()
        
        response_data = response.json()
        if isinstance(response_data, list):
            response_text = response_data[0].get("generated_text", "")
        else:
            response_text = response_data.get("generated_text", "")
            
        snippet = _extract_json_snippet(response_text)
        if not snippet:
            logger.error(f"No JSON found in BLOOM response: {response_text[:100]}...")
            return _create_error_result()

        try:
            parsed = json.loads(snippet)
        except json.JSONDecodeError:
            try:
                parsed = json.loads(snippet.replace("'", '"'))
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON snippet from BLOOM: {snippet[:100]}...")
                return _create_error_result()

        return {
            "score": float(parsed.get("score", 0)),
            "total": float(parsed.get("total", rubric.get("max_score", 100))),
            "mistakes": parsed.get("mistakes", {}),
            "grading_feedback": parsed.get("grading_feedback", "No feedback provided."),
        }
    except ConnectionError as e:
        logger.error(f"Connection error with BLOOM API: {e}")
        global NETWORK_AVAILABLE
        NETWORK_AVAILABLE = False
        raise
    except Exception as e:
        logger.error(f"Error with BLOOM grading: {e}")
        raise


def grade_with_flan_t5(
    question_text: str, 
    submission_text: str, 
    answer_key: str, 
    rubric: Dict[str, Any], 
    strictness_level: int = 3
) -> Dict[str, Any]:
    """Grade with Flan-T5 model via Hugging Face."""
    prompt = get_grading_prompt(question_text, answer_key, submission_text, rubric, strictness_level)
    
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_length": 1024,
            "temperature": 0.2
        }
    }
    
    try:
        response = requests.post(HF_FLAN_T5_URL, headers=HEADERS_FLAN_T5, json=payload, timeout=30)
        response.raise_for_status()
        
        response_data = response.json()
        if isinstance(response_data, list):
            response_text = response_data[0].get("generated_text", "")
        else:
            response_text = response_data.get("generated_text", "")
            
        snippet = _extract_json_snippet(response_text)
        if not snippet:
            logger.error(f"No JSON found in Flan-T5 response: {response_text[:100]}...")
            return _create_error_result()

        try:
            parsed = json.loads(snippet)
        except json.JSONDecodeError:
            try:
                parsed = json.loads(snippet.replace("'", '"'))
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON snippet from Flan-T5: {snippet[:100]}...")
                return _create_error_result()

        return {
            "score": float(parsed.get("score", 0)),
            "total": float(parsed.get("total", rubric.get("max_score", 100))),
            "mistakes": parsed.get("mistakes", {}),
            "grading_feedback": parsed.get("grading_feedback", "No feedback provided."),
        }
    except ConnectionError as e:
        logger.error(f"Connection error with Flan-T5 API: {e}")
        global NETWORK_AVAILABLE
        NETWORK_AVAILABLE = False
        raise
    except Exception as e:
        logger.error(f"Error with Flan-T5 grading: {e}")
        raise


def grade_with_openai(
    question_text: str, 
    submission_text: str, 
    answer_key: str, 
    rubric: Dict[str, Any], 
    strictness_level: int = 3
) -> Dict[str, Any]:
    """Grade with OpenAI models."""
    if not OPENAI_API_KEY:
        raise ValueError("OpenAI API key not available")
        
    prompt = get_grading_prompt(question_text, answer_key, submission_text, rubric, strictness_level)
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY}"
    }
    
    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [
            {"role": "system", "content": (
                "You are a grading assistant. Respond only with a JSON object "
                "containing exactly these keys: \"score\", \"total\", \"mistakes\", \"grading_feedback\"."
            )},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 1000
    }
    
    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions", 
            headers=headers, 
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        
        response_text = response.json()["choices"][0]["message"]["content"]
        
        snippet = _extract_json_snippet(response_text)
        if not snippet:
            logger.error(f"No JSON found in OpenAI response")
            return _create_error_result()

        try:
            parsed = json.loads(snippet)
        except json.JSONDecodeError:
            try:
                # Try to fix common JSON issues
                fixed_json = snippet.replace("'", '"').replace("None", "null")
                fixed_json = fixed_json.replace("True", "true").replace("False", "false")
                parsed = json.loads(fixed_json)
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON snippet from OpenAI")
                return _create_error_result()

        return {
            "score": float(parsed.get("score", 0)),
            "total": float(parsed.get("total", rubric.get("max_score", 100))),
            "mistakes": parsed.get("mistakes", {}),
            "grading_feedback": parsed.get("grading_feedback", "No feedback provided."),
        }
    except ConnectionError as e:
        logger.error(f"Connection error with OpenAI API: {e}")
        raise
    except Exception as e:
        logger.error(f"Error with OpenAI grading: {e}")
        raise


def _create_simple_grading_result(submission_text: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a simple grading result when network or API services are unavailable.
    Uses basic text analysis to generate a score.
    """
    try:
        # Calculate a score based on simple metrics
        word_count = len(submission_text.split())
        max_score = rubric.get("max_score", 100)
        
        # Word count thresholds for scoring
        if word_count < 50:
            score = max_score * 0.4  # Very short answer
        elif word_count < 150:
            score = max_score * 0.6  # Short answer
        elif word_count < 300:
            score = max_score * 0.75  # Medium answer
        else:
            score = max_score * 0.85  # Long answer
            
        # Look for keywords in the rubric to adjust score
        if "criteria" in rubric and isinstance(rubric["criteria"], list):
            keywords = []
            for criterion in rubric["criteria"]:
                if "description" in criterion:
                    # Extract key terms from criteria descriptions
                    desc = criterion["description"].lower()
                    words = re.findall(r'\b\w{4,}\b', desc)  # Words with 4+ chars
                    keywords.extend(words)
            
            # Count matches in submission
            matches = 0
            submission_lower = submission_text.lower()
            for keyword in keywords:
                if keyword in submission_lower:
                    matches += 1
            
            # Adjust score based on keyword matches
            keyword_bonus = min(0.15, (matches / max(1, len(keywords))) * 0.15)
            score += max_score * keyword_bonus
        
        # Ensure score is within bounds
        score = max(0, min(max_score, score))
        
        return {
            "score": round(score, 1),
            "total": float(max_score),
            "mistakes": {"notice": "Graded using simplified method due to connectivity issues"},
            "grading_feedback": (
                "This submission was graded using a simplified method due to network "
                "connectivity issues. The score is based on length and content analysis. "
                f"Word count: {word_count}. Please re-grade when network is available."
            )
        }
    except Exception as e:
        logger.error(f"Error in simple grading: {e}")
        return _create_error_result()

def batch_grade(
    submissions: Dict[str, str], 
    question_text: str, 
    answer_key: str,
    rubric: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Grade multiple submissions in a batch with improved rate limiting.
    
    Args:
        submissions: Dictionary mapping student IDs to their submissions
        question_text: The question text
        answer_key: Reference answer or grading key
        rubric: Grading rubric
    
    Returns:
        Dictionary mapping student IDs to their grading results
    """
    results = {}
    
    # Determine base delay based on which APIs will likely be used
    base_delay = 1.0  # Default delay between submissions
    if GEMINI_API_KEY:
        # Gemini might need a bit more time between calls
        base_delay = 4.0
        
    for i, (student_name, submission) in enumerate(submissions.items()):
        try:
            if not submission or not submission.strip():
                logger.warning(f"Submission for {student_name} is empty. Skipping.")
                results[student_name] = _create_error_result()
                continue
                
            logger.info(f"Grading submission for {student_name} ({i+1}/{len(submissions)})")
            
            # Grade the submission
            result = grade_submission(question_text, submission, answer_key, rubric)
            results[student_name] = result
            logger.info(f"Completed grading for {student_name}: {result['score']}/{result['total']}")
            
            # Add a delay between submissions that increases for large batches
            delay = base_delay
            if len(submissions) > 10:
                # Add additional delay for larger batches to prevent cumulative rate limit issues
                delay += min(2.0, len(submissions) / 20)
            
            if i < len(submissions) - 1:  # Don't wait after last submission
                logger.info(f"Waiting {delay:.1f}s before next submission")
                time.sleep(delay)
            
        except Exception as e:
            logger.error(f"Error grading {student_name}: {e}")
            results[student_name] = _create_error_result()
            
    logger.info(f"Batch grading completed for {len(results)} submissions.")
    return results

def generate_summary(results: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a summary of the grading results.
    
    Args:
        results: Dictionary mapping student IDs to their grading results
    
    Returns:
        Summary statistics and aggregated results
    """
    if not results:
        return {
            "batch_info": {
                "id": datetime.now().strftime("%Y%m%d_%H%M%S"),
                "timestamp": datetime.now().isoformat(),
                "total_submissions": 0
            },
            "summary_stats": {
                "average_score": 0,
                "passing_count": 0,
                "submission_count": 0
            },
            "student_results": {}
        }
        
    total_submissions = len(results)
    total_score = sum(result['score'] for result in results.values())
    
    # Find the most common total score to use as the max
    total_max_score = max(result['total'] for result in results.values()) if total_submissions > 0 else 100
    
    # Calculate average (as percentage)
    average_score = (total_score / (total_max_score * total_submissions)) * 100 if total_submissions > 0 else 0
    
    # Count passing submissions (score >= 70% of max)
    passing_threshold = 0.7 * total_max_score
    passing_count = sum(1 for result in results.values() if result['score'] >= passing_threshold)
    
    # Create grade distribution
    grade_counts = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
    for result in results.values():
        percent = (result['score'] / result['total']) * 100
        if percent >= 90:
            grade_counts["A"] += 1
        elif percent >= 80:
            grade_counts["B"] += 1
        elif percent >= 70:
            grade_counts["C"] += 1
        elif percent >= 60:
            grade_counts["D"] += 1
        else:
            grade_counts["F"] += 1
    
    summary = {
        "batch_info": {
            "id": datetime.now().strftime("%Y%m%d_%H%M%S"),
            "timestamp": datetime.now().isoformat(),
            "total_submissions": total_submissions
        },
        "summary_stats": {
            "average_score": round(average_score, 2),
            "passing_count": passing_count,
            "submission_count": total_submissions,
            "grade_distribution": grade_counts
        },
        "student_results": results
    }
    return summary


def _create_error_result() -> Dict[str, Any]:
    """
    Create a default error result when grading fails.
    """
    return {
        'score': 0,
        'total': 100,
        'mistakes': {"error": "Unable to grade submission"},
        'grading_feedback': 'Error occurred during grading. The submission could not be evaluated.'
    }
