"""
Simple In-Memory Cache Service for Canvas API Responses
Reduces latency by caching frequently accessed data
"""

import time
import hashlib
import json
from typing import Any, Optional, Dict
from functools import wraps
import logging

logger = logging.getLogger(__name__)

class CacheService:
    """Simple in-memory cache with TTL support"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._default_ttl = 60  # Default 60 seconds
    
    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate a unique cache key"""
        key_data = f"{prefix}:{json.dumps(args, sort_keys=True)}:{json.dumps(kwargs, sort_keys=True)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if key in self._cache:
            entry = self._cache[key]
            if time.time() < entry['expires_at']:
                return entry['value']
            else:
                # Expired, remove from cache
                del self._cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache with TTL"""
        ttl = ttl or self._default_ttl
        self._cache[key] = {
            'value': value,
            'expires_at': time.time() + ttl,
            'created_at': time.time()
        }
    
    def delete(self, key: str) -> None:
        """Delete a specific key from cache"""
        if key in self._cache:
            del self._cache[key]
    
    def clear_prefix(self, prefix: str) -> int:
        """Clear all keys starting with prefix"""
        keys_to_delete = [k for k in self._cache.keys() if k.startswith(prefix)]
        for key in keys_to_delete:
            del self._cache[key]
        return len(keys_to_delete)
    
    def clear_user_cache(self, user_id: str) -> int:
        """Clear all cache entries for a specific user"""
        return self.clear_prefix(f"user:{user_id}")
    
    def clear_all(self) -> None:
        """Clear entire cache"""
        self._cache.clear()
    
    def get_stats(self) -> Dict[str, int]:
        """Get cache statistics"""
        now = time.time()
        total = len(self._cache)
        expired = sum(1 for entry in self._cache.values() if now >= entry['expires_at'])
        return {
            'total_entries': total,
            'expired_entries': expired,
            'active_entries': total - expired
        }

# Global cache instance
cache = CacheService()

# Cache TTL constants (in seconds)
CACHE_TTL_CONFIG = 120      # 2 minutes for config
CACHE_TTL_COURSES = 60      # 1 minute for courses list
CACHE_TTL_DETAILS = 45      # 45 seconds for course details
CACHE_TTL_STUDENTS = 60     # 1 minute for students
CACHE_TTL_SUBMISSIONS = 30  # 30 seconds for submissions


def cached(prefix: str, ttl: int = 60):
    """
    Decorator to cache function results
    
    Usage:
        @cached("canvas_courses", ttl=60)
        async def get_courses(user_id: str):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user_id from kwargs or first arg if available
            user_id = kwargs.get('user_id') or (args[0] if args else 'global')
            cache_key = f"user:{user_id}:{prefix}:{cache._generate_key(prefix, *args[1:], **kwargs)}"
            
            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache HIT for {prefix}")
                return cached_value
            
            # Execute function and cache result
            logger.debug(f"Cache MISS for {prefix}")
            result = await func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            return result
        
        return wrapper
    return decorator


def invalidate_user_canvas_cache(user_id: str) -> None:
    """Invalidate all Canvas-related cache for a user"""
    cache.clear_prefix(f"user:{user_id}:canvas")


def get_cached_or_fetch(key: str, ttl: int = 60):
    """
    Context manager style cache helper
    
    Usage:
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data
        # ... fetch data ...
        cache.set(cache_key, data, ttl)
    """
    return cache.get(key), lambda data: cache.set(key, data, ttl)
