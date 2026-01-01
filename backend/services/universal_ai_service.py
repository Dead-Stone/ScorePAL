"""
Universal AI Service for ScorePAL
Supports multiple AI providers through a unified interface
"""

import os
import logging
import time
import json
import asyncio
from typing import Dict, Any, List, Optional, Union, Tuple
from datetime import datetime
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Import AI provider SDKs
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

try:
    from google import genai
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

try:
    import cohere
    COHERE_AVAILABLE = True
except ImportError:
    COHERE_AVAILABLE = False

from models.ai_config import AIProvider, AIModelConfig, ModelSelectionRequest
from utils.encryption import encrypt_api_key, decrypt_api_key

logger = logging.getLogger(__name__)

class AIProviderInterface:
    """Base interface for AI providers"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.provider = config.get('provider')
        self.model_name = config.get('model_name')
        self.api_key = config.get('api_key')
        self.api_endpoint = config.get('api_endpoint')
        self.max_tokens = config.get('max_tokens', 2048)
        self.temperature = float(config.get('temperature', 0.7))
        self.top_p = float(config.get('top_p', 0.9))
        self.frequency_penalty = float(config.get('frequency_penalty', 0.0))
        self.presence_penalty = float(config.get('presence_penalty', 0.0))
        self.extra_config = config.get('extra_config', {})
    
    async def generate_text(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate text using the AI provider"""
        raise NotImplementedError("Subclasses must implement generate_text")
    
    def estimate_cost(self, prompt_tokens: int, completion_tokens: int = 0) -> float:
        """Estimate cost for the request"""
        cost_per_1k = float(self.config.get('cost_per_1k_tokens', 0.0))
        total_tokens = prompt_tokens + completion_tokens
        return (total_tokens / 1000) * cost_per_1k
    
    def count_tokens(self, text: str) -> int:
        """Estimate token count (rough approximation)"""
        # Simple approximation: ~4 characters per token
        return len(text) // 4

class OpenAIProvider(AIProviderInterface):
    """OpenAI provider implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        if not OPENAI_AVAILABLE:
            raise ImportError("OpenAI package not installed")
        
        self.client = openai.OpenAI(
            api_key=self.api_key,
            base_url=self.api_endpoint if self.api_endpoint else None
        )
    
    async def generate_text(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate text using OpenAI"""
        try:
            messages = [{"role": "user", "content": prompt}]
            
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                max_tokens=kwargs.get('max_tokens', self.max_tokens),
                temperature=kwargs.get('temperature', self.temperature),
                top_p=kwargs.get('top_p', self.top_p),
                frequency_penalty=kwargs.get('frequency_penalty', self.frequency_penalty),
                presence_penalty=kwargs.get('presence_penalty', self.presence_penalty)
            )
            
            result = {
                'text': response.choices[0].message.content,
                'usage': {
                    'prompt_tokens': response.usage.prompt_tokens,
                    'completion_tokens': response.usage.completion_tokens,
                    'total_tokens': response.usage.total_tokens
                },
                'model': response.model,
                'provider': 'openai'
            }
            
            return result
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise

class AnthropicProvider(AIProviderInterface):
    """Anthropic Claude provider implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        if not ANTHROPIC_AVAILABLE:
            raise ImportError("Anthropic package not installed")
        
        self.client = anthropic.Anthropic(
            api_key=self.api_key,
            base_url=self.api_endpoint if self.api_endpoint else None
        )
    
    async def generate_text(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate text using Anthropic Claude"""
        try:
            response = self.client.messages.create(
                model=self.model_name,
                max_tokens=kwargs.get('max_tokens', self.max_tokens),
                temperature=kwargs.get('temperature', self.temperature),
                top_p=kwargs.get('top_p', self.top_p),
                messages=[{"role": "user", "content": prompt}]
            )
            
            result = {
                'text': response.content[0].text,
                'usage': {
                    'prompt_tokens': response.usage.input_tokens,
                    'completion_tokens': response.usage.output_tokens,
                    'total_tokens': response.usage.input_tokens + response.usage.output_tokens
                },
                'model': response.model,
                'provider': 'anthropic'
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise

class GoogleProvider(AIProviderInterface):
    """Google Gemini provider implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        if not GOOGLE_AVAILABLE:
            raise ImportError("Google AI package not installed")
        
        # Use new Client pattern
        from google import genai
        self.client = genai.Client(api_key=self.api_key)
        
        # Default to free model if not specified
        if not self.model_name or self.model_name == "":
            self.model_name = "gemini-2.5-flash"
    
    async def generate_text(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate text using Google Gemini"""
        try:
            # Use new Client pattern with free model
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            
            # Extract token usage if available
            prompt_tokens = self.count_tokens(prompt)
            completion_tokens = self.count_tokens(response.text) if response.text else 0
            
            result = {
                'text': response.text,
                'usage': {
                    'prompt_tokens': prompt_tokens,
                    'completion_tokens': completion_tokens,
                    'total_tokens': prompt_tokens + completion_tokens
                },
                'model': self.model_name,
                'provider': 'google'
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Google Gemini API error: {e}")
            raise

class HuggingFaceProvider(AIProviderInterface):
    """Hugging Face provider implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.session = requests.Session()
        
        # Set up retry strategy
        retry_strategy = Retry(
            total=3,
            status_forcelist=[429, 500, 502, 503, 504],
            method_whitelist=["HEAD", "GET", "PUT", "DELETE", "OPTIONS", "TRACE", "POST"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
    
    async def generate_text(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate text using Hugging Face Inference API"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # Determine API endpoint - use router.huggingface.co (required as of 2024)
            if self.api_endpoint:
                url = self.api_endpoint
            else:
                url = f"https://router.huggingface.co/models/{self.model_name}"
            
            payload = {
                "inputs": prompt,
                "parameters": {
                    "max_length": kwargs.get('max_tokens', self.max_tokens),
                    "temperature": kwargs.get('temperature', self.temperature),
                    "top_p": kwargs.get('top_p', self.top_p),
                    "do_sample": True,
                    "return_full_text": False
                }
            }
            
            response = self.session.post(url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            
            # Handle different response formats
            if isinstance(data, list) and len(data) > 0:
                text = data[0].get('generated_text', '')
            elif isinstance(data, dict):
                text = data.get('generated_text', '')
            else:
                text = str(data)
            
            prompt_tokens = self.count_tokens(prompt)
            completion_tokens = self.count_tokens(text)
            
            result = {
                'text': text,
                'usage': {
                    'prompt_tokens': prompt_tokens,
                    'completion_tokens': completion_tokens,
                    'total_tokens': prompt_tokens + completion_tokens
                },
                'model': self.model_name,
                'provider': 'huggingface'
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Hugging Face API error: {e}")
            raise

class PerplexityProvider(AIProviderInterface):
    """Perplexity provider implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.session = requests.Session()
    
    async def generate_text(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate text using Perplexity API"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            url = self.api_endpoint or "https://api.perplexity.ai/chat/completions"
            
            payload = {
                "model": self.model_name,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": kwargs.get('max_tokens', self.max_tokens),
                "temperature": kwargs.get('temperature', self.temperature),
                "top_p": kwargs.get('top_p', self.top_p)
            }
            
            response = self.session.post(url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            
            result = {
                'text': data['choices'][0]['message']['content'],
                'usage': data.get('usage', {
                    'prompt_tokens': self.count_tokens(prompt),
                    'completion_tokens': self.count_tokens(data['choices'][0]['message']['content']),
                    'total_tokens': 0
                }),
                'model': data.get('model', self.model_name),
                'provider': 'perplexity'
            }
            
            # Calculate total tokens if not provided
            if result['usage']['total_tokens'] == 0:
                result['usage']['total_tokens'] = result['usage']['prompt_tokens'] + result['usage']['completion_tokens']
            
            return result
            
        except Exception as e:
            logger.error(f"Perplexity API error: {e}")
            raise

class CoherePage(AIProviderInterface):
    """Cohere provider implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        if not COHERE_AVAILABLE:
            raise ImportError("Cohere package not installed")
        
        self.client = cohere.Client(api_key=self.api_key)
    
    async def generate_text(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate text using Cohere"""
        try:
            response = self.client.generate(
                model=self.model_name,
                prompt=prompt,
                max_tokens=kwargs.get('max_tokens', self.max_tokens),
                temperature=kwargs.get('temperature', self.temperature),
                p=kwargs.get('top_p', self.top_p),
                frequency_penalty=kwargs.get('frequency_penalty', self.frequency_penalty),
                presence_penalty=kwargs.get('presence_penalty', self.presence_penalty)
            )
            
            prompt_tokens = self.count_tokens(prompt)
            completion_tokens = self.count_tokens(response.generations[0].text)
            
            result = {
                'text': response.generations[0].text,
                'usage': {
                    'prompt_tokens': prompt_tokens,
                    'completion_tokens': completion_tokens,
                    'total_tokens': prompt_tokens + completion_tokens
                },
                'model': self.model_name,
                'provider': 'cohere'
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Cohere API error: {e}")
            raise

class UniversalAIService:
    """Universal AI service that manages multiple providers"""
    
    def __init__(self):
        self.providers = {
            AIProvider.OPENAI: OpenAIProvider,
            AIProvider.ANTHROPIC: AnthropicProvider,
            AIProvider.GOOGLE: GoogleProvider,
            AIProvider.HUGGINGFACE: HuggingFaceProvider,
            AIProvider.PERPLEXITY: PerplexityProvider,
            AIProvider.COHERE: CoherePage,
        }
        
        # Cache for initialized providers
        self._provider_cache = {}
        
        # Rate limiting
        self._rate_limits = {}
        self._last_requests = {}
    
    def _get_provider(self, config: Dict[str, Any]) -> AIProviderInterface:
        """Get or create provider instance"""
        provider_key = f"{config['provider']}_{config['model_name']}_{hash(config['api_key'])}"
        
        if provider_key not in self._provider_cache:
            provider_class = self.providers.get(config['provider'])
            if not provider_class:
                raise ValueError(f"Unsupported provider: {config['provider']}")
            
            self._provider_cache[provider_key] = provider_class(config)
        
        return self._provider_cache[provider_key]
    
    async def _apply_rate_limiting(self, provider: str, model: str):
        """Apply rate limiting for the provider"""
        key = f"{provider}_{model}"
        
        # Default rate limits (requests per minute)
        default_limits = {
            'openai': 60,
            'anthropic': 60,
            'google': 60,
            'huggingface': 30,
            'perplexity': 20,
            'cohere': 60
        }
        
        limit = default_limits.get(provider, 30)
        interval = 60.0 / limit  # seconds between requests
        
        if key in self._last_requests:
            time_since_last = time.time() - self._last_requests[key]
            if time_since_last < interval:
                sleep_time = interval - time_since_last
                logger.info(f"Rate limiting {provider}: waiting {sleep_time:.2f}s")
                await asyncio.sleep(sleep_time)
        
        self._last_requests[key] = time.time()
    
    async def generate_text(self, 
                          config: Dict[str, Any], 
                          prompt: str, 
                          **kwargs) -> Dict[str, Any]:
        """Generate text using specified provider configuration"""
        try:
            # Apply rate limiting
            await self._apply_rate_limiting(config['provider'], config['model_name'])
            
            # Get provider instance
            provider = self._get_provider(config)
            
            # Generate text
            start_time = time.time()
            result = await provider.generate_text(prompt, **kwargs)
            end_time = time.time()
            
            # Add timing and metadata
            result['response_time'] = end_time - start_time
            result['timestamp'] = datetime.now().isoformat()
            result['cost_estimate'] = provider.estimate_cost(
                result['usage']['prompt_tokens'],
                result['usage']['completion_tokens']
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating text with {config['provider']}: {e}")
            raise
    
    async def generate_with_fallback(self, 
                                   configs: List[Dict[str, Any]], 
                                   prompt: str, 
                                   **kwargs) -> Dict[str, Any]:
        """Generate text with fallback to other providers if the first fails"""
        last_error = None
        
        for i, config in enumerate(configs):
            try:
                logger.info(f"Attempting generation with {config['provider']} (attempt {i+1}/{len(configs)})")
                result = await self.generate_text(config, prompt, **kwargs)
                result['fallback_used'] = i > 0
                result['provider_attempts'] = i + 1
                return result
                
            except Exception as e:
                last_error = e
                logger.warning(f"Provider {config['provider']} failed: {e}")
                if i < len(configs) - 1:
                    continue
        
        # If all providers failed
        raise last_error or Exception("All providers failed")
    
    def get_available_providers(self) -> List[Dict[str, Any]]:
        """Get list of available providers with their status"""
        providers = []
        
        for provider_enum in AIProvider:
            provider_class = self.providers.get(provider_enum)
            available = provider_class is not None
            
            # Check if required packages are installed
            if provider_enum == AIProvider.OPENAI:
                available = available and OPENAI_AVAILABLE
            elif provider_enum == AIProvider.ANTHROPIC:
                available = available and ANTHROPIC_AVAILABLE
            elif provider_enum == AIProvider.GOOGLE:
                available = available and GOOGLE_AVAILABLE
            elif provider_enum == AIProvider.COHERE:
                available = available and COHERE_AVAILABLE
            
            providers.append({
                'provider': provider_enum.value,
                'available': available,
                'name': provider_enum.value.title()
            })
        
        return providers
    
    def validate_config(self, config: Dict[str, Any]) -> Tuple[bool, str]:
        """Validate provider configuration"""
        required_fields = ['provider', 'model_name', 'api_key']
        
        for field in required_fields:
            if not config.get(field):
                return False, f"Missing required field: {field}"
        
        provider = config['provider']
        if provider not in [p.value for p in AIProvider]:
            return False, f"Unsupported provider: {provider}"
        
        # Validate provider-specific requirements
        if provider == AIProvider.OPENAI.value and not OPENAI_AVAILABLE:
            return False, "OpenAI package not installed"
        elif provider == AIProvider.ANTHROPIC.value and not ANTHROPIC_AVAILABLE:
            return False, "Anthropic package not installed"
        elif provider == AIProvider.GOOGLE.value and not GOOGLE_AVAILABLE:
            return False, "Google AI package not installed"
        elif provider == AIProvider.COHERE.value and not COHERE_AVAILABLE:
            return False, "Cohere package not installed"
        
        return True, "Configuration is valid"

# Global instance
universal_ai_service = UniversalAIService() 