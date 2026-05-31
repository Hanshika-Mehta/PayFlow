"""
Idempotency service for preventing duplicate payment processing.
Implements idempotency key handling with Redis caching.
"""
import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from app.core.redis_client import get_redis
from app.core.config import settings

logger = logging.getLogger(__name__)


class IdempotencyService:
    """
    Service for managing idempotency keys and preventing duplicate operations.
    
    Idempotency ensures that multiple identical requests have the same effect
    as a single request. This is critical for payment systems where network
    issues or client retries could cause duplicate charges.
    """
    
    def __init__(self):
        """Initialize idempotency service with Redis client."""
        self.redis = get_redis()
        self.ttl = settings.IDEMPOTENCY_KEY_TTL
        self.enabled = settings.IDEMPOTENCY_ENABLED
        
        # Initialize stats counters in Redis if they don't exist
        self._init_stats_counters()
    
    def _init_stats_counters(self):
        """Initialize statistics counters in Redis."""
        try:
            if not self.redis.exists("idem:stats:total_requests"):
                self.redis.set("idem:stats:total_requests", 0)
            if not self.redis.exists("idem:stats:cache_hits"):
                self.redis.set("idem:stats:cache_hits", 0)
            if not self.redis.exists("idem:stats:cache_misses"):
                self.redis.set("idem:stats:cache_misses", 0)
        except Exception as e:
            logger.error(f"Error initializing stats counters: {e}")
    
    def _increment_stat(self, stat_name: str):
        """Increment a statistics counter."""
        try:
            self.redis.incr(f"idem:stats:{stat_name}")
        except Exception as e:
            logger.error(f"Error incrementing stat {stat_name}: {e}")
    
    def _get_response_key(self, key: str) -> str:
        """Get Redis key for cached response."""
        return f"idem:response:{key}"
    
    def _get_processing_key(self, key: str) -> str:
        """Get Redis key for processing lock."""
        return f"idem:processing:{key}"
    
    def get_cached_response(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Get cached response for an idempotency key.
        
        Args:
            key: Idempotency key from client
            
        Returns:
            Cached response dict if exists, None otherwise
        """
        if not self.enabled:
            return None
        
        try:
            # Increment total requests
            self._increment_stat("total_requests")
            
            redis_key = self._get_response_key(key)
            data = self.redis.get(redis_key)
            
            if data:
                logger.info(f"Idempotency cache hit for key: {key}")
                # Increment cache hits
                self._increment_stat("cache_hits")
                
                cached = json.loads(data)
                
                # Add replay metadata
                cached['_idempotency_replay'] = True
                cached['_cached_at'] = cached.get('_cached_at')
                
                return cached
            
            # Increment cache misses
            self._increment_stat("cache_misses")
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached response for key {key}: {e}")
            return None
    
    def cache_response(self, key: str, response: Dict[str, Any]) -> bool:
        """
        Cache a response for an idempotency key.
        
        Args:
            key: Idempotency key from client
            response: Response data to cache
            
        Returns:
            True if cached successfully, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            redis_key = self._get_response_key(key)
            
            # Add caching metadata
            response_with_meta = {
                **response,
                '_cached_at': datetime.utcnow().isoformat(),
                '_idempotency_key': key
            }
            
            # Cache with TTL
            self.redis.setex(
                redis_key,
                self.ttl,
                json.dumps(response_with_meta)
            )
            
            logger.info(f"Cached response for idempotency key: {key} (TTL: {self.ttl}s)")
            return True
            
        except Exception as e:
            logger.error(f"Error caching response for key {key}: {e}")
            return False
    
    def is_processing(self, key: str) -> bool:
        """
        Check if a request with this key is currently being processed.
        
        This prevents concurrent requests with the same idempotency key
        from being processed simultaneously.
        
        Args:
            key: Idempotency key to check
            
        Returns:
            True if currently processing, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            processing_key = self._get_processing_key(key)
            return self.redis.exists(processing_key) > 0
            
        except Exception as e:
            logger.error(f"Error checking processing status for key {key}: {e}")
            return False
    
    def mark_processing(self, key: str, timeout: int = 60) -> bool:
        """
        Mark an idempotency key as currently being processed.
        
        Args:
            key: Idempotency key to mark
            timeout: Lock timeout in seconds (default: 60)
            
        Returns:
            True if marked successfully, False if already processing
        """
        if not self.enabled:
            return True
        
        try:
            processing_key = self._get_processing_key(key)
            
            # Use SETNX (SET if Not eXists) for atomic lock acquisition
            result = self.redis.set(processing_key, "1", nx=True, ex=timeout)
            
            if result:
                logger.info(f"Marked idempotency key as processing: {key}")
                return True
            else:
                logger.warning(f"Idempotency key already processing: {key}")
                return False
                
        except Exception as e:
            logger.error(f"Error marking key as processing {key}: {e}")
            return False
    
    def unmark_processing(self, key: str) -> bool:
        """
        Remove processing lock for an idempotency key.
        
        Args:
            key: Idempotency key to unmark
            
        Returns:
            True if unmarked successfully, False otherwise
        """
        if not self.enabled:
            return True
        
        try:
            processing_key = self._get_processing_key(key)
            self.redis.delete(processing_key)
            logger.info(f"Unmarked idempotency key from processing: {key}")
            return True
            
        except Exception as e:
            logger.error(f"Error unmarking key from processing {key}: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get idempotency usage statistics.
        
        Returns:
            Dictionary with idempotency statistics
        """
        try:
            # Get stats from Redis
            total_requests = int(self.redis.get("idem:stats:total_requests") or 0)
            cache_hits = int(self.redis.get("idem:stats:cache_hits") or 0)
            cache_misses = int(self.redis.get("idem:stats:cache_misses") or 0)
            
            # Calculate hit rate
            hit_rate = (cache_hits / total_requests * 100) if total_requests > 0 else 0.0
            
            # Count cached responses
            pattern = "idem:response:*"
            cached_keys = list(self.redis.scan_iter(match=pattern, count=1000))
            cached_count = len(cached_keys)
            
            # Count processing locks
            pattern = "idem:processing:*"
            processing_keys = list(self.redis.scan_iter(match=pattern, count=1000))
            processing_count = len(processing_keys)
            
            return {
                "enabled": self.enabled,
                "total_requests": total_requests,
                "cache_hits": cache_hits,
                "cache_misses": cache_misses,
                "hit_rate": round(hit_rate, 2),
                "cached_responses": cached_count,
                "currently_processing": processing_count,
                "ttl_seconds": self.ttl,
                "ttl_hours": self.ttl / 3600
            }
            
        except Exception as e:
            logger.error(f"Error getting idempotency stats: {e}")
            return {
                "enabled": self.enabled,
                "total_requests": 0,
                "cache_hits": 0,
                "cache_misses": 0,
                "hit_rate": 0.0,
                "error": str(e)
            }
    
    def clear_key(self, key: str) -> bool:
        """
        Clear both cached response and processing lock for a key.
        
        Useful for testing or manual intervention.
        
        Args:
            key: Idempotency key to clear
            
        Returns:
            True if cleared successfully, False otherwise
        """
        try:
            response_key = self._get_response_key(key)
            processing_key = self._get_processing_key(key)
            
            self.redis.delete(response_key, processing_key)
            logger.info(f"Cleared idempotency key: {key}")
            return True
            
        except Exception as e:
            logger.error(f"Error clearing idempotency key {key}: {e}")
            return False


# Global idempotency service instance
idempotency_service = IdempotencyService()

# Made with Bob