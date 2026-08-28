"""
Redis-based caching for grading results
Reduces API calls and improves performance
"""

import json
import hashlib
import logging
from typing import Optional, Dict, Any
from datetime import timedelta

logger = logging.getLogger(__name__)

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available. Caching will be disabled.")


class GradingCache:
    """Cache grading results and intermediate data"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379", ttl: int = 604800):
        """
        Initialize grading cache.
        
        Args:
            redis_url: Redis connection URL
            ttl: Time to live in seconds (default: 7 days)
        """
        self.redis = None
        self.redis_url = redis_url
        self.ttl = ttl
        self.enabled = REDIS_AVAILABLE
    
    async def connect(self):
        """Connect to Redis"""
        if not self.enabled:
            return
        
        try:
            self.redis = redis.from_url(self.redis_url, decode_responses=True)
            # Test connection
            await self.redis.ping()
            logger.info("Connected to Redis cache")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}. Caching disabled.")
            self.enabled = False
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis:
            await self.redis.close()
    
    def _cache_key(
        self, 
        submission_text: str, 
        question_text: str,
        rubric: Dict[str, Any],
        strictness: float
    ) -> str:
        """Generate cache key from submission and rubric"""
        # Normalize inputs
        content = json.dumps({
            "submission": submission_text.strip().lower(),
            "question": question_text.strip().lower(),
            "rubric": self._normalize_rubric(rubric),
            "strictness": round(strictness, 2)
        }, sort_keys=True)
        
        # Create hash
        key_hash = hashlib.sha256(content.encode()).hexdigest()
        return f"grading:{key_hash}"
    
    def _normalize_rubric(self, rubric: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize rubric for consistent hashing"""
        if isinstance(rubric, dict):
            # Sort criteria by name for consistency
            criteria = rubric.get("criteria", [])
            sorted_criteria = sorted(
                criteria,
                key=lambda x: x.get("name", "")
            )
            return {
                "criteria": sorted_criteria,
                "total_points": rubric.get("total_points", 100)
            }
        return {}
    
    async def get_cached_result(
        self,
        submission_text: str,
        question_text: str,
        rubric: Dict[str, Any],
        strictness: float
    ) -> Optional[Dict[str, Any]]:
        """Get cached grading result"""
        if not self.enabled or not self.redis:
            return None
        
        try:
            key = self._cache_key(submission_text, question_text, rubric, strictness)
            cached = await self.redis.get(key)
            
            if cached:
                logger.info(f"Cache hit for key: {key[:20]}...")
                return json.loads(cached)
            
            return None
        except Exception as e:
            logger.warning(f"Error getting cached result: {e}")
            return None
    
    async def cache_result(
        self,
        submission_text: str,
        question_text: str,
        rubric: Dict[str, Any],
        strictness: float,
        result: Dict[str, Any]
    ):
        """Cache grading result"""
        if not self.enabled or not self.redis:
            return
        
        try:
            key = self._cache_key(submission_text, question_text, rubric, strictness)
            
            # Don't cache results with errors
            if result.get("error"):
                return
            
            # Store result
            await self.redis.setex(
                key,
                self.ttl,
                json.dumps(result)
            )
            
            logger.info(f"Cached result for key: {key[:20]}...")
        except Exception as e:
            logger.warning(f"Error caching result: {e}")
    
    async def invalidate_cache(
        self,
        submission_text: Optional[str] = None,
        question_text: Optional[str] = None,
        rubric: Optional[Dict[str, Any]] = None
    ):
        """Invalidate cache entries matching criteria"""
        if not self.enabled or not self.redis:
            return
        
        try:
            # If all parameters provided, invalidate specific key
            if submission_text and question_text and rubric:
                # This would require strictness, so we'll do pattern matching
                pattern = "grading:*"
                keys = await self.redis.keys(pattern)
                
                # Check each key (this is not efficient for large caches)
                for key in keys:
                    cached = await self.redis.get(key)
                    if cached:
                        cached_data = json.loads(cached)
                        # Check if matches criteria (simplified)
                        # In production, use Redis SCAN with pattern matching
                        pass
            else:
                # Invalidate all grading cache
                pattern = "grading:*"
                keys = await self.redis.keys(pattern)
                if keys:
                    await self.redis.delete(*keys)
                    logger.info(f"Invalidated {len(keys)} cache entries")
        except Exception as e:
            logger.warning(f"Error invalidating cache: {e}")
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.enabled or not self.redis:
            return {"enabled": False}
        
        try:
            info = await self.redis.info("stats")
            pattern = "grading:*"
            keys = await self.redis.keys(pattern)
            
            return {
                "enabled": True,
                "total_keys": len(keys),
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
                "hit_rate": (
                    info.get("keyspace_hits", 0) / 
                    max(info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0), 1)
                )
            }
        except Exception as e:
            logger.warning(f"Error getting cache stats: {e}")
            return {"enabled": False, "error": str(e)}


# Global cache instance
_cache_instance: Optional[GradingCache] = None


async def get_grading_cache(redis_url: str = None) -> GradingCache:
    """Get or create global cache instance"""
    global _cache_instance
    
    if _cache_instance is None:
        redis_url = redis_url or "redis://localhost:6379"
        _cache_instance = GradingCache(redis_url=redis_url)
        await _cache_instance.connect()
    
    return _cache_instance

