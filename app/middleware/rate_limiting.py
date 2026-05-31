"""
Rate limiting middleware for FastAPI.
Implements per-user and per-IP rate limiting.
"""
import logging
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from app.services.rate_limit_service import rate_limit_service

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce rate limits on API requests.
    
    Checks both per-user and per-IP rate limits and returns
    429 Too Many Requests if limits are exceeded.
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    def _get_client_ip(self, request: Request) -> str:
        """
        Extract client IP address from request.
        
        Checks X-Forwarded-For header first (for proxied requests),
        then falls back to direct client IP.
        
        Args:
            request: Incoming request
            
        Returns:
            Client IP address
        """
        # Check X-Forwarded-For header (for proxied requests)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()
        
        # Fall back to direct client IP
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def _get_user_id(self, request: Request) -> str:
        """
        Extract user ID from request.
        
        This is a simplified version. In production, you would:
        - Parse JWT token
        - Check session
        - Use authenticated user ID
        
        Args:
            request: Incoming request
            
        Returns:
            User ID or "anonymous"
        """
        # Try to get from query params (for testing)
        user_id = request.query_params.get("user_id")
        if user_id:
            return user_id
        
        # Try to get from request body (for POST requests)
        # This is simplified - in production use proper auth
        if hasattr(request.state, "user_id"):
            return request.state.user_id
        
        # Default to IP-based limiting for anonymous users
        return f"anon:{self._get_client_ip(request)}"
    
    async def dispatch(self, request: Request, call_next):
        """
        Process request with rate limiting.
        
        Args:
            request: Incoming request
            call_next: Next middleware/handler
            
        Returns:
            Response or 429 error
        """
        # Skip rate limiting for monitoring endpoints
        if request.url.path.startswith("/monitoring"):
            return await call_next(request)
        
        # Skip rate limiting for health checks
        if request.url.path in ["/", "/health", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)
        
        # Only apply rate limiting to write operations (POST, PUT, DELETE, PATCH)
        # GET requests are typically read-only and less resource-intensive
        if request.method not in ["POST", "PUT", "DELETE", "PATCH"]:
            return await call_next(request)
        
        # Get identifiers
        ip_address = self._get_client_ip(request)
        user_id = self._get_user_id(request)
        
        # Check IP rate limit
        ip_allowed, ip_info = rate_limit_service.check_ip_rate_limit(ip_address)
        
        if not ip_allowed:
            logger.warning(f"IP rate limit exceeded for {ip_address}")
            
            response = JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "message": "IP rate limit exceeded. Please try again later.",
                    "limit": ip_info["limit"],
                    "remaining": ip_info["remaining"],
                    "reset": ip_info["reset"],
                    "retry_after": ip_info.get("retry_after", 60)
                }
            )
            
            # Add rate limit headers
            response.headers["X-RateLimit-Limit"] = str(ip_info["limit"])
            response.headers["X-RateLimit-Remaining"] = str(ip_info["remaining"])
            response.headers["X-RateLimit-Reset"] = str(ip_info["reset"])
            response.headers["Retry-After"] = str(ip_info.get("retry_after", 60))
            
            return response
        
        # Check user rate limit
        user_allowed, user_info = rate_limit_service.check_user_rate_limit(user_id)
        
        if not user_allowed:
            logger.warning(f"User rate limit exceeded for {user_id}")
            
            response = JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "message": "User rate limit exceeded. Please try again later.",
                    "limit": user_info["limit"],
                    "remaining": user_info["remaining"],
                    "reset": user_info["reset"],
                    "retry_after": user_info.get("retry_after", 60)
                }
            )
            
            # Add rate limit headers
            response.headers["X-RateLimit-Limit"] = str(user_info["limit"])
            response.headers["X-RateLimit-Remaining"] = str(user_info["remaining"])
            response.headers["X-RateLimit-Reset"] = str(user_info["reset"])
            response.headers["Retry-After"] = str(user_info.get("retry_after", 60))
            
            return response
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers to successful responses
        response.headers["X-RateLimit-Limit"] = str(user_info["limit"])
        response.headers["X-RateLimit-Remaining"] = str(user_info["remaining"])
        response.headers["X-RateLimit-Reset"] = str(user_info["reset"])
        
        return response


# Made with Bob