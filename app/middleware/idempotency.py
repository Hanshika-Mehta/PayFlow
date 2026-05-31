"""
Idempotency middleware for FastAPI.
Handles idempotency key validation and response caching.
"""
import json
import logging
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from app.services.idempotency_service import idempotency_service
from app.core.config import settings

logger = logging.getLogger(__name__)


class IdempotencyMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle idempotency for POST requests.
    
    Checks for Idempotency-Key header and:
    1. Returns cached response if key exists
    2. Prevents concurrent processing of same key
    3. Caches successful responses for replay
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.header_name = settings.IDEMPOTENCY_KEY_HEADER
    
    async def dispatch(self, request: Request, call_next):
        """
        Process request with idempotency handling.
        
        Args:
            request: Incoming request
            call_next: Next middleware/handler
            
        Returns:
            Response (cached or fresh)
        """
        # Only apply to POST requests
        if request.method != "POST":
            return await call_next(request)
        
        # Get idempotency key from header
        idem_key = request.headers.get(self.header_name)
        
        # If no idempotency key, process normally
        if not idem_key:
            return await call_next(request)
        
        # Validate key format (basic validation)
        if len(idem_key) < 1 or len(idem_key) > 255:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Invalid idempotency key",
                    "message": "Idempotency key must be between 1 and 255 characters"
                }
            )
        
        # Check for cached response
        cached_response = idempotency_service.get_cached_response(idem_key)
        if cached_response:
            logger.info(f"Returning cached response for idempotency key: {idem_key}")
            
            # Remove internal metadata before returning
            response_data = {k: v for k, v in cached_response.items() 
                           if not k.startswith('_')}
            
            response = JSONResponse(content=response_data)
            response.headers["X-Idempotency-Replay"] = "true"
            response.headers["X-Idempotency-Key"] = idem_key
            
            return response
        
        # Check if currently being processed
        if idempotency_service.is_processing(idem_key):
            logger.warning(f"Concurrent request detected for idempotency key: {idem_key}")
            return JSONResponse(
                status_code=409,
                content={
                    "error": "Conflict",
                    "message": "A request with this idempotency key is currently being processed"
                }
            )
        
        # Mark as processing
        if not idempotency_service.mark_processing(idem_key):
            return JSONResponse(
                status_code=409,
                content={
                    "error": "Conflict",
                    "message": "Failed to acquire processing lock"
                }
            )
        
        try:
            # Process the request
            response = await call_next(request)
            
            # Cache successful responses (2xx status codes)
            if 200 <= response.status_code < 300:
                # Read response body - handle both sync and async iterators
                response_body = b""
                
                # Check if response has body_iterator (StreamingResponse)
                if hasattr(response, 'body_iterator'):
                    async for chunk in response.body_iterator:
                        response_body += chunk
                # Otherwise, try to get body directly
                elif hasattr(response, 'body'):
                    response_body = response.body
                else:
                    # Fallback: return response without caching
                    logger.warning(f"Could not read response body for caching: {idem_key}")
                    return response
                
                # Parse JSON response
                try:
                    response_data = json.loads(response_body.decode())
                    
                    # Cache the response
                    success = idempotency_service.cache_response(idem_key, response_data)
                    if success:
                        logger.info(f"Successfully cached response for idempotency key: {idem_key}")
                    else:
                        logger.warning(f"Failed to cache response for idempotency key: {idem_key}")
                    
                    # Create new response with same data
                    new_response = JSONResponse(
                        content=response_data,
                        status_code=response.status_code
                    )
                    
                    # Copy headers
                    for key, value in response.headers.items():
                        if key.lower() not in ['content-length', 'content-type']:
                            new_response.headers[key] = value
                    
                    new_response.headers["X-Idempotency-Replay"] = "false"
                    new_response.headers["X-Idempotency-Key"] = idem_key
                    
                    return new_response
                    
                except json.JSONDecodeError as e:
                    logger.warning(f"Could not parse response for caching: {idem_key}, error: {e}")
                    # Return original response if can't parse
                    return Response(
                        content=response_body,
                        status_code=response.status_code,
                        headers=dict(response.headers)
                    )
                except Exception as e:
                    logger.error(f"Error caching response for {idem_key}: {e}")
                    # Return response without caching on error
                    return Response(
                        content=response_body,
                        status_code=response.status_code,
                        headers=dict(response.headers)
                    )
            
            return response
            
        finally:
            # Always unmark processing
            idempotency_service.unmark_processing(idem_key)


# Made with Bob