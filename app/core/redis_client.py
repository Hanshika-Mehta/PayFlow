"""
Redis client connection and utilities.
Provides Redis connection for queue operations and caching.
"""
import redis
from app.core.config import settings
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class RedisClient:
    """
    Redis client wrapper for managing connections and operations.
    Singleton pattern to ensure single Redis connection pool.
    """
    _instance: Optional['RedisClient'] = None
    _redis_client: Optional[redis.Redis] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize Redis connection if not already connected."""
        if self._redis_client is None:
            try:
                self._redis_client = redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,  # Automatically decode responses to strings
                    socket_connect_timeout=5,
                    socket_timeout=5
                )
                # Test connection
                self._redis_client.ping()
                logger.info("Redis connection established successfully")
            except redis.ConnectionError as e:
                logger.error(f"Failed to connect to Redis: {e}")
                raise
    
    @property
    def client(self) -> redis.Redis:
        """Get the Redis client instance."""
        if self._redis_client is None:
            raise RuntimeError("Redis client not initialized")
        return self._redis_client
    
    def ping(self) -> bool:
        """
        Test Redis connection.
        
        Returns:
            True if connection is alive, False otherwise
        """
        try:
            return self.client.ping()
        except redis.ConnectionError:
            return False
    
    def close(self):
        """Close Redis connection."""
        if self._redis_client:
            self._redis_client.close()
            logger.info("Redis connection closed")


# Global Redis client instance
redis_client = RedisClient()


def get_redis() -> redis.Redis:
    """
    Dependency function to get Redis client.
    Can be used in FastAPI endpoints with Depends().
    
    Returns:
        Redis client instance
    """
    return redis_client.client

# Made with Bob
