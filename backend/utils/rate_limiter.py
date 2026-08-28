"""
Intelligent rate limiting for API calls
Prevents hitting API limits and implements exponential backoff
"""

import asyncio
import logging
import time
from typing import Optional
from collections import deque
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

try:
    from aiolimiter import AsyncLimiter
    AIOLIMITER_AVAILABLE = True
except ImportError:
    AIOLIMITER_AVAILABLE = False
    logger.warning("aiolimiter not available. Using basic rate limiting.")


class RateLimiter:
    """Rate limiter with exponential backoff"""
    
    def __init__(
        self,
        max_rate: int = 50,
        time_period: int = 60,
        max_retries: int = 3,
        initial_backoff: float = 1.0
    ):
        """
        Initialize rate limiter.
        
        Args:
            max_rate: Maximum number of requests
            time_period: Time period in seconds
            max_retries: Maximum retry attempts
            initial_backoff: Initial backoff time in seconds
        """
        self.max_rate = max_rate
        self.time_period = time_period
        self.max_retries = max_retries
        self.initial_backoff = initial_backoff
        
        if AIOLIMITER_AVAILABLE:
            self.limiter = AsyncLimiter(max_rate=max_rate, time_period=time_period)
        else:
            self.limiter = None
            self.request_times = deque()
        
        self.retry_count = {}
    
    async def acquire(self):
        """Acquire permission to make a request"""
        if self.limiter:
            await self.limiter.acquire()
        else:
            await self._basic_rate_limit()
    
    async def _basic_rate_limit(self):
        """Basic rate limiting without aiolimiter"""
        now = time.time()
        
        # Remove old request times
        while self.request_times and self.request_times[0] < now - self.time_period:
            self.request_times.popleft()
        
        # Check if we're at the limit
        if len(self.request_times) >= self.max_rate:
            # Wait until the oldest request expires
            wait_time = self.request_times[0] + self.time_period - now
            if wait_time > 0:
                logger.info(f"Rate limit reached. Waiting {wait_time:.2f}s")
                await asyncio.sleep(wait_time)
                # Clean up again after waiting
                now = time.time()
                while self.request_times and self.request_times[0] < now - self.time_period:
                    self.request_times.popleft()
        
        # Record this request
        self.request_times.append(time.time())
    
    async def execute_with_retry(
        self,
        coro,
        operation_id: Optional[str] = None
    ):
        """
        Execute a coroutine with rate limiting and retry logic.
        
        Args:
            coro: Coroutine to execute
            operation_id: Optional identifier for tracking retries
            
        Returns:
            Result of the coroutine
        """
        operation_id = operation_id or "default"
        retry_count = self.retry_count.get(operation_id, 0)
        
        while retry_count <= self.max_retries:
            try:
                # Acquire rate limit permission
                await self.acquire()
                
                # Execute the coroutine
                result = await coro
                
                # Reset retry count on success
                if operation_id in self.retry_count:
                    del self.retry_count[operation_id]
                
                return result
                
            except Exception as e:
                retry_count += 1
                self.retry_count[operation_id] = retry_count
                
                if retry_count > self.max_retries:
                    logger.error(
                        f"Operation {operation_id} failed after {self.max_retries} retries: {e}"
                    )
                    raise
                
                # Calculate exponential backoff
                backoff_time = self.initial_backoff * (2 ** (retry_count - 1))
                logger.warning(
                    f"Operation {operation_id} failed (attempt {retry_count}/{self.max_retries}). "
                    f"Retrying in {backoff_time:.2f}s: {e}"
                )
                
                await asyncio.sleep(backoff_time)
        
        raise RuntimeError(f"Operation {operation_id} failed after all retries")


class AdaptiveRateLimiter(RateLimiter):
    """Rate limiter that adapts based on API responses"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.success_count = 0
        self.error_count = 0
        self.last_adjustment = time.time()
        self.adjustment_interval = 300  # Adjust every 5 minutes
    
    async def execute_with_retry(self, coro, operation_id: Optional[str] = None):
        """Execute with adaptive rate limiting"""
        try:
            result = await super().execute_with_retry(coro, operation_id)
            self.success_count += 1
            await self._maybe_adjust_rate()
            return result
        except Exception as e:
            # Check if it's a rate limit error
            if "rate limit" in str(e).lower() or "429" in str(e):
                self.error_count += 1
                await self._reduce_rate()
            raise
    
    async def _maybe_adjust_rate(self):
        """Adjust rate based on success/error ratio"""
        now = time.time()
        
        if now - self.last_adjustment < self.adjustment_interval:
            return
        
        total = self.success_count + self.error_count
        if total < 10:  # Need enough data
            return
        
        error_rate = self.error_count / total
        
        if error_rate > 0.1:  # More than 10% errors
            await self._reduce_rate()
        elif error_rate < 0.01 and self.success_count > 50:  # Very low error rate
            await self._increase_rate()
        
        # Reset counters
        self.success_count = 0
        self.error_count = 0
        self.last_adjustment = now
    
    async def _reduce_rate(self):
        """Reduce rate limit"""
        old_rate = self.max_rate
        self.max_rate = max(int(self.max_rate * 0.8), 10)  # Reduce by 20%, min 10
        logger.info(f"Reduced rate limit from {old_rate} to {self.max_rate} req/min")
        
        if self.limiter and AIOLIMITER_AVAILABLE:
            self.limiter = AsyncLimiter(
                max_rate=self.max_rate,
                time_period=self.time_period
            )
    
    async def _increase_rate(self):
        """Increase rate limit (cautiously)"""
        old_rate = self.max_rate
        self.max_rate = min(int(self.max_rate * 1.1), 100)  # Increase by 10%, max 100
        logger.info(f"Increased rate limit from {old_rate} to {self.max_rate} req/min")
        
        if self.limiter and AIOLIMITER_AVAILABLE:
            self.limiter = AsyncLimiter(
                max_rate=self.max_rate,
                time_period=self.time_period
            )


# Global rate limiter instance
_global_limiter: Optional[RateLimiter] = None


def get_rate_limiter(
    max_rate: int = 50,
    time_period: int = 60,
    adaptive: bool = False
) -> RateLimiter:
    """Get or create global rate limiter"""
    global _global_limiter
    
    if _global_limiter is None:
        if adaptive:
            _global_limiter = AdaptiveRateLimiter(
                max_rate=max_rate,
                time_period=time_period
            )
        else:
            _global_limiter = RateLimiter(
                max_rate=max_rate,
                time_period=time_period
            )
    
    return _global_limiter

