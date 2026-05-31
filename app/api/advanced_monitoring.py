"""
Advanced monitoring endpoints for Week 4 features.
Provides statistics and insights for idempotency and rate limiting.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from app.services.idempotency_service import idempotency_service
from app.services.rate_limit_service import rate_limit_service
from app.core.redis_client import redis_client
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/monitoring", tags=["Advanced Monitoring"])


@router.get("/idempotency-stats")
async def get_idempotency_stats() -> Dict[str, Any]:
    """
    Get idempotency statistics.
    
    Returns:
        Statistics about idempotency key usage, cache hits, etc.
    """
    try:
        stats = idempotency_service.get_stats()
        
        # Get additional Redis-based stats
        redis = redis_client.client
        
        # Count total idempotency keys in Redis
        idem_keys = redis.keys("idem:response:*")
        processing_keys = redis.keys("idem:processing:*")
        
        stats.update({
            "total_cached_responses": len(idem_keys),
            "currently_processing": len(processing_keys),
            "redis_connected": True
        })
        
        return {
            "status": "success",
            "data": stats
        }
        
    except Exception as e:
        logger.error(f"Error fetching idempotency stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/idempotency-keys")
async def get_idempotency_keys(limit: int = 50) -> Dict[str, Any]:
    """
    Get list of recent idempotency keys.
    
    Args:
        limit: Maximum number of keys to return
        
    Returns:
        List of idempotency keys with their metadata
    """
    try:
        redis = redis_client.client
        
        # Get all idempotency response keys
        keys = redis.keys("idem:response:*")
        
        # Limit results
        keys = keys[:limit]
        
        # Get details for each key
        key_details = []
        for key in keys:
            key_str = key.decode() if isinstance(key, bytes) else key
            idem_key = key_str.replace("idem:response:", "")
            
            # Get TTL
            ttl = redis.ttl(key)
            
            # Get value (response data)
            value = redis.get(key)
            
            key_details.append({
                "idempotency_key": idem_key,
                "ttl_seconds": ttl,
                "has_response": value is not None,
                "redis_key": key_str
            })
        
        return {
            "status": "success",
            "data": {
                "total_keys": len(keys),
                "keys": key_details
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching idempotency keys: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/idempotency-keys/{idempotency_key}")
async def delete_idempotency_key(idempotency_key: str) -> Dict[str, Any]:
    """
    Delete a specific idempotency key (for testing/admin purposes).
    
    Args:
        idempotency_key: The idempotency key to delete
        
    Returns:
        Success message
    """
    try:
        redis = redis_client.client
        
        # Delete both response and processing keys
        response_key = f"idem:response:{idempotency_key}"
        processing_key = f"idem:processing:{idempotency_key}"
        
        deleted_count = redis.delete(response_key, processing_key)
        
        return {
            "status": "success",
            "message": f"Deleted {deleted_count} keys for idempotency key: {idempotency_key}"
        }
        
    except Exception as e:
        logger.error(f"Error deleting idempotency key: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rate-limit-stats")
async def get_rate_limit_stats() -> Dict[str, Any]:
    """
    Get rate limiting statistics.
    
    Returns:
        Statistics about rate limit usage, blocked requests, etc.
    """
    try:
        stats = rate_limit_service.get_stats()
        
        # Get additional Redis-based stats
        redis = redis_client.client
        
        # Count active rate limit keys
        user_keys = redis.keys("rate_limit:user:*")
        ip_keys = redis.keys("rate_limit:ip:*")
        
        stats.update({
            "active_user_limits": len(user_keys),
            "active_ip_limits": len(ip_keys),
            "redis_connected": True
        })
        
        return {
            "status": "success",
            "data": stats
        }
        
    except Exception as e:
        logger.error(f"Error fetching rate limit stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rate-limit-users")
async def get_rate_limited_users(limit: int = 50) -> Dict[str, Any]:
    """
    Get list of users with active rate limits.
    
    Args:
        limit: Maximum number of users to return
        
    Returns:
        List of users with their current rate limit status
    """
    try:
        redis = redis_client.client
        
        # Get all user rate limit keys
        keys = redis.keys("rate_limit:user:*")
        
        # Limit results
        keys = keys[:limit]
        
        # Get details for each user
        user_details = []
        for key in keys:
            key_str = key.decode() if isinstance(key, bytes) else key
            user_id = key_str.replace("rate_limit:user:", "")
            
            # Get current count
            count = redis.get(key)
            count_val = int(count) if count else 0
            
            # Get TTL
            ttl = redis.ttl(key)
            
            user_details.append({
                "user_id": user_id,
                "current_requests": count_val,
                "ttl_seconds": ttl,
                "redis_key": key_str
            })
        
        return {
            "status": "success",
            "data": {
                "total_users": len(keys),
                "users": user_details
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching rate limited users: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rate-limit-ips")
async def get_rate_limited_ips(limit: int = 50) -> Dict[str, Any]:
    """
    Get list of IPs with active rate limits.
    
    Args:
        limit: Maximum number of IPs to return
        
    Returns:
        List of IPs with their current rate limit status
    """
    try:
        redis = redis_client.client
        
        # Get all IP rate limit keys
        keys = redis.keys("rate_limit:ip:*")
        
        # Limit results
        keys = keys[:limit]
        
        # Get details for each IP
        ip_details = []
        for key in keys:
            key_str = key.decode() if isinstance(key, bytes) else key
            ip_address = key_str.replace("rate_limit:ip:", "")
            
            # Get current count
            count = redis.get(key)
            count_val = int(count) if count else 0
            
            # Get TTL
            ttl = redis.ttl(key)
            
            ip_details.append({
                "ip_address": ip_address,
                "current_requests": count_val,
                "ttl_seconds": ttl,
                "redis_key": key_str
            })
        
        return {
            "status": "success",
            "data": {
                "total_ips": len(keys),
                "ips": ip_details
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching rate limited IPs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/rate-limit-reset/{identifier}")
async def reset_rate_limit(identifier: str, limit_type: str = "user") -> Dict[str, Any]:
    """
    Reset rate limit for a specific user or IP (for testing/admin purposes).
    
    Args:
        identifier: User ID or IP address
        limit_type: Type of limit to reset ("user" or "ip")
        
    Returns:
        Success message
    """
    try:
        redis = redis_client.client
        
        if limit_type not in ["user", "ip"]:
            raise HTTPException(status_code=400, detail="limit_type must be 'user' or 'ip'")
        
        # Delete the rate limit key
        key = f"rate_limit:{limit_type}:{identifier}"
        deleted = redis.delete(key)
        
        return {
            "status": "success",
            "message": f"Reset rate limit for {limit_type}: {identifier}",
            "deleted": deleted > 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting rate limit: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/week4-summary")
async def get_week4_summary() -> Dict[str, Any]:
    """
    Get comprehensive Week 4 feature summary.
    
    Returns:
        Combined statistics for idempotency and rate limiting
    """
    try:
        # Get idempotency stats
        idem_stats = idempotency_service.get_stats()
        
        # Get rate limit stats
        rate_stats = rate_limit_service.get_stats()
        
        # Get Redis counts
        redis = redis_client.client
        idem_keys = redis.keys("idem:response:*")
        user_keys = redis.keys("rate_limit:user:*")
        ip_keys = redis.keys("rate_limit:ip:*")
        
        return {
            "status": "success",
            "data": {
                "idempotency": {
                    **idem_stats,
                    "cached_responses": len(idem_keys)
                },
                "rate_limiting": {
                    **rate_stats,
                    "active_user_limits": len(user_keys),
                    "active_ip_limits": len(ip_keys)
                },
                "features_enabled": {
                    "idempotency": True,
                    "rate_limiting": True
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching Week 4 summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Made with Bob