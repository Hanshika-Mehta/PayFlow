"""
Rate limiting service for protecting against abuse and excessive requests.
Implements sliding window rate limiting with Redis.
"""
import time
import logging
from typing import Tuple, Dict, Any, Optional
from app.core.redis_client import get_redis
from app.core.config import settings

logger = logging.getLogger(__name__)


class RateLimitService:
    """
    Service for rate limiting API requests.
    
    Implements a sliding window algorithm using Redis to track
    request counts per identifier (user ID, IP address, etc.)
    """
    
    def __init__(self):
        """Initialize rate limit service with Redis client."""
        self.redis = get_redis()
        self.enabled = settings.RATE_LIMIT_ENABLED
        self.per_user_limit = settings.RATE_LIMIT_PER_USER
        self.per_ip_limit = settings.RATE_LIMIT_PER_IP
        self.window = settings.RATE_LIMIT_WINDOW
    
    def _get_key(self, identifier_type: str, identifier: str) -> str:
        """
        Get Redis key for rate limit counter.
        
        Args:
            identifier_type: Type of identifier (user, ip, global)
            identifier: The actual identifier value
            
        Returns:
            Redis key string
        """
        return f"rate_limit:{identifier_type}:{identifier}"
    
    def check_rate_limit(
        self,
        identifier: str,
        limit: int,
        window: int,
        identifier_type: str = "user"
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if request is within rate limit.
        
        Args:
            identifier: Unique identifier (user_id, IP address, etc.)
            limit: Maximum requests allowed in window
            window: Time window in seconds
            identifier_type: Type of identifier for key namespacing
            
        Returns:
            Tuple of (allowed: bool, info: dict)
            - allowed: True if request is allowed, False if rate limited
            - info: Dictionary with rate limit information
        """
        if not self.enabled:
            return True, {
                "enabled": False,
                "limit": limit,
                "remaining": limit,
                "reset": int(time.time()) + window
            }
        
        try:
            key = self._get_key(identifier_type, identifier)
            current = self.redis.get(key)
            
            if current is None:
                # First request in window
                self.redis.setex(key, window, 1)
                
                return True, {
                    "limit": limit,
                    "remaining": limit - 1,
                    "reset": int(time.time()) + window,
                    "current": 1
                }
            
            current = int(current)
            
            if current >= limit:
                # Rate limit exceeded
                ttl = self.redis.ttl(key)
                reset_time = int(time.time()) + max(ttl, 0)
                
                logger.warning(
                    f"Rate limit exceeded for {identifier_type}:{identifier} "
                    f"({current}/{limit} requests)"
                )
                
                return False, {
                    "limit": limit,
                    "remaining": 0,
                    "reset": reset_time,
                    "current": current,
                    "retry_after": max(ttl, 0)
                }
            
            # Increment counter
            new_count = self.redis.incr(key)
            ttl = self.redis.ttl(key)
            reset_time = int(time.time()) + max(ttl, 0)
            
            return True, {
                "limit": limit,
                "remaining": limit - new_count,
                "reset": reset_time,
                "current": new_count
            }
            
        except Exception as e:
            logger.error(f"Error checking rate limit for {identifier}: {e}")
            # On error, allow the request (fail open)
            return True, {
                "limit": limit,
                "remaining": limit,
                "reset": int(time.time()) + window,
                "error": str(e)
            }
    
    def check_user_rate_limit(self, user_id: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Check rate limit for a specific user.
        
        Args:
            user_id: User identifier
            
        Returns:
            Tuple of (allowed: bool, info: dict)
        """
        return self.check_rate_limit(
            identifier=user_id,
            limit=self.per_user_limit,
            window=self.window,
            identifier_type="user"
        )
    
    def check_ip_rate_limit(self, ip_address: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Check rate limit for a specific IP address.
        
        Args:
            ip_address: Client IP address
            
        Returns:
            Tuple of (allowed: bool, info: dict)
        """
        return self.check_rate_limit(
            identifier=ip_address,
            limit=self.per_ip_limit,
            window=self.window,
            identifier_type="ip"
        )
    
    def get_current_usage(self, identifier: str, identifier_type: str = "user") -> Dict[str, Any]:
        """
        Get current rate limit usage for an identifier.
        
        Args:
            identifier: Unique identifier
            identifier_type: Type of identifier
            
        Returns:
            Dictionary with current usage information
        """
        try:
            key = self._get_key(identifier_type, identifier)
            current = self.redis.get(key)
            ttl = self.redis.ttl(key)
            
            if current is None:
                return {
                    "identifier": identifier,
                    "type": identifier_type,
                    "current": 0,
                    "limit": self.per_user_limit if identifier_type == "user" else self.per_ip_limit,
                    "remaining": self.per_user_limit if identifier_type == "user" else self.per_ip_limit,
                    "reset": int(time.time()) + self.window
                }
            
            current = int(current)
            limit = self.per_user_limit if identifier_type == "user" else self.per_ip_limit
            
            return {
                "identifier": identifier,
                "type": identifier_type,
                "current": current,
                "limit": limit,
                "remaining": max(0, limit - current),
                "reset": int(time.time()) + max(ttl, 0)
            }
            
        except Exception as e:
            logger.error(f"Error getting usage for {identifier}: {e}")
            return {
                "identifier": identifier,
                "type": identifier_type,
                "error": str(e)
            }
    
    def reset_limit(self, identifier: str, identifier_type: str = "user") -> bool:
        """
        Reset rate limit for an identifier.
        
        Useful for testing or manual intervention.
        
        Args:
            identifier: Unique identifier
            identifier_type: Type of identifier
            
        Returns:
            True if reset successfully, False otherwise
        """
        try:
            key = self._get_key(identifier_type, identifier)
            self.redis.delete(key)
            logger.info(f"Reset rate limit for {identifier_type}:{identifier}")
            return True
            
        except Exception as e:
            logger.error(f"Error resetting rate limit for {identifier}: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get rate limiting statistics.
        
        Returns:
            Dictionary with rate limiting statistics
        """
        try:
            # Count active rate limit keys
            user_pattern = "rate_limit:user:*"
            ip_pattern = "rate_limit:ip:*"
            
            user_keys = list(self.redis.scan_iter(match=user_pattern, count=1000))
            ip_keys = list(self.redis.scan_iter(match=ip_pattern, count=1000))
            
            # Get top rate-limited users
            top_users = []
            for key in user_keys[:10]:  # Top 10
                try:
                    count = int(self.redis.get(key) or 0)
                    user_id = key.decode('utf-8').split(':')[-1] if isinstance(key, bytes) else key.split(':')[-1]
                    top_users.append({
                        "user_id": user_id,
                        "requests": count,
                        "limit": self.per_user_limit
                    })
                except:
                    continue
            
            # Sort by request count
            top_users.sort(key=lambda x: x['requests'], reverse=True)
            
            return {
                "enabled": self.enabled,
                "per_user_limit": self.per_user_limit,
                "per_ip_limit": self.per_ip_limit,
                "window_seconds": self.window,
                "active_user_limits": len(user_keys),
                "active_ip_limits": len(ip_keys),
                "top_users": top_users[:5]  # Top 5
            }
            
        except Exception as e:
            logger.error(f"Error getting rate limit stats: {e}")
            return {
                "enabled": self.enabled,
                "error": str(e)
            }
    
    def get_violations(self, limit: int = 100) -> list:
        """
        Get recent rate limit violations.
        
        Args:
            limit: Maximum number of violations to return
            
        Returns:
            List of violation records
        """
        try:
            violations = []
            
            # Check user limits
            user_pattern = "rate_limit:user:*"
            user_keys = list(self.redis.scan_iter(match=user_pattern, count=limit))
            
            for key in user_keys:
                try:
                    count = int(self.redis.get(key) or 0)
                    if count >= self.per_user_limit:
                        user_id = key.decode('utf-8').split(':')[-1] if isinstance(key, bytes) else key.split(':')[-1]
                        ttl = self.redis.ttl(key)
                        violations.append({
                            "type": "user",
                            "identifier": user_id,
                            "requests": count,
                            "limit": self.per_user_limit,
                            "reset_in": max(ttl, 0)
                        })
                except:
                    continue
            
            # Check IP limits
            ip_pattern = "rate_limit:ip:*"
            ip_keys = list(self.redis.scan_iter(match=ip_pattern, count=limit))
            
            for key in ip_keys:
                try:
                    count = int(self.redis.get(key) or 0)
                    if count >= self.per_ip_limit:
                        ip = key.decode('utf-8').split(':')[-1] if isinstance(key, bytes) else key.split(':')[-1]
                        ttl = self.redis.ttl(key)
                        violations.append({
                            "type": "ip",
                            "identifier": ip,
                            "requests": count,
                            "limit": self.per_ip_limit,
                            "reset_in": max(ttl, 0)
                        })
                except:
                    continue
            
            return violations
            
        except Exception as e:
            logger.error(f"Error getting violations: {e}")
            return []


# Global rate limit service instance
rate_limit_service = RateLimitService()

# Made with Bob