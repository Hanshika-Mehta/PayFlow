# Week 4 Implementation Plan: Idempotency + Rate Limiting

## 🎯 Overview

Week 4 focuses on two critical production features:
1. **Idempotency** - Prevent duplicate payments from client retries
2. **Rate Limiting** - Protect against abuse and excessive requests

---

## 📋 Week 4 Goals

### 1. Idempotency Implementation
**Problem:** Client retries can cause duplicate payments
**Solution:** Idempotency keys to detect and prevent duplicates

### 2. Rate Limiting
**Problem:** Users can overwhelm the system with requests
**Solution:** Redis-based rate limiting per user/IP

---

## 🏗️ Architecture Changes

### Idempotency Flow
```
Client Request with Idempotency-Key
    ↓
Check Redis: Key exists?
    ↓
YES → Return cached response (no processing)
    ↓
NO → Process payment + Cache response
```

### Rate Limiting Flow
```
Request arrives
    ↓
Check Redis: rate_limit:{user_id}
    ↓
Count > Limit? → 429 Too Many Requests
    ↓
Count <= Limit? → Process + Increment counter
```

---

## 📊 Implementation Tasks

### Phase 1: Idempotency (Priority: HIGH)

#### Backend Tasks:
- [ ] Create idempotency service (`app/services/idempotency_service.py`)
- [ ] Add idempotency middleware to FastAPI
- [ ] Update payment creation endpoint to use idempotency keys
- [ ] Store idempotency responses in Redis (24-hour TTL)
- [ ] Add idempotency key validation
- [ ] Handle concurrent requests with same key

#### Database Tasks:
- [ ] Optional: Create `idempotency_keys` table for persistence
- [ ] Add indexes for fast lookups

#### Configuration:
```python
# .env additions
IDEMPOTENCY_KEY_TTL=86400  # 24 hours
IDEMPOTENCY_KEY_HEADER=Idempotency-Key
```

#### API Changes:
```http
POST /payments
Headers:
  Idempotency-Key: abc-123-def-456
  
Response:
  X-Idempotency-Replay: true/false
```

---

### Phase 2: Rate Limiting (Priority: HIGH)

#### Backend Tasks:
- [ ] Create rate limiting service (`app/services/rate_limit_service.py`)
- [ ] Implement sliding window algorithm
- [ ] Add rate limit middleware
- [ ] Configure limits per endpoint
- [ ] Add rate limit headers to responses

#### Rate Limit Strategies:
1. **Per User** - `rate_limit:user:{user_id}`
2. **Per IP** - `rate_limit:ip:{ip_address}`
3. **Global** - `rate_limit:global`

#### Configuration:
```python
# .env additions
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_USER=100  # requests per minute
RATE_LIMIT_PER_IP=200
RATE_LIMIT_WINDOW=60  # seconds
```

#### Response Headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

### Phase 3: Monitoring & UI

#### Monitoring Endpoints:
- [ ] `GET /monitoring/idempotency-stats` - Idempotency usage
- [ ] `GET /monitoring/rate-limit-stats` - Rate limit violations

#### UI Components:
- [ ] Update Rate Limiting page with real data
- [ ] Add idempotency statistics dashboard
- [ ] Show rate limit violations
- [ ] Display top rate-limited users

---

## 🔧 Technical Implementation

### 1. Idempotency Service

```python
class IdempotencyService:
    def __init__(self):
        self.redis = get_redis()
        self.ttl = settings.IDEMPOTENCY_KEY_TTL
    
    def get_cached_response(self, key: str):
        """Get cached response for idempotency key"""
        data = self.redis.get(f"idem:{key}")
        if data:
            return json.loads(data)
        return None
    
    def cache_response(self, key: str, response: dict):
        """Cache response for idempotency key"""
        self.redis.setex(
            f"idem:{key}",
            self.ttl,
            json.dumps(response)
        )
    
    def is_processing(self, key: str) -> bool:
        """Check if request is currently being processed"""
        return self.redis.exists(f"idem:processing:{key}")
    
    def mark_processing(self, key: str):
        """Mark key as currently processing"""
        self.redis.setex(f"idem:processing:{key}", 60, "1")
    
    def unmark_processing(self, key: str):
        """Remove processing marker"""
        self.redis.delete(f"idem:processing:{key}")
```

### 2. Rate Limiting Service

```python
class RateLimitService:
    def __init__(self):
        self.redis = get_redis()
    
    def check_rate_limit(self, identifier: str, limit: int, window: int) -> tuple[bool, dict]:
        """
        Check if request is within rate limit.
        
        Returns:
            (allowed: bool, info: dict)
        """
        key = f"rate_limit:{identifier}"
        current = self.redis.get(key)
        
        if current is None:
            # First request in window
            self.redis.setex(key, window, 1)
            return True, {
                "limit": limit,
                "remaining": limit - 1,
                "reset": int(time.time()) + window
            }
        
        current = int(current)
        
        if current >= limit:
            # Rate limit exceeded
            ttl = self.redis.ttl(key)
            return False, {
                "limit": limit,
                "remaining": 0,
                "reset": int(time.time()) + ttl
            }
        
        # Increment counter
        self.redis.incr(key)
        ttl = self.redis.ttl(key)
        
        return True, {
            "limit": limit,
            "remaining": limit - current - 1,
            "reset": int(time.time()) + ttl
        }
```

### 3. Middleware Implementation

```python
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

class IdempotencyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only for POST requests
        if request.method != "POST":
            return await call_next(request)
        
        # Get idempotency key from header
        idem_key = request.headers.get("Idempotency-Key")
        
        if idem_key:
            # Check for cached response
            cached = idempotency_service.get_cached_response(idem_key)
            if cached:
                response = JSONResponse(cached)
                response.headers["X-Idempotency-Replay"] = "true"
                return response
            
            # Check if currently processing
            if idempotency_service.is_processing(idem_key):
                raise HTTPException(409, "Request already processing")
            
            # Mark as processing
            idempotency_service.mark_processing(idem_key)
        
        # Process request
        response = await call_next(request)
        
        # Cache response if idempotency key provided
        if idem_key and response.status_code == 200:
            # Cache the response
            idempotency_service.cache_response(idem_key, response_data)
            idempotency_service.unmark_processing(idem_key)
        
        return response
```

---

## 🧪 Testing Strategy

### Idempotency Tests:

1. **Test duplicate prevention:**
   - Send same request twice with same key
   - Verify only one payment created
   - Verify second request returns cached response

2. **Test concurrent requests:**
   - Send multiple requests simultaneously with same key
   - Verify only one processes, others get 409 Conflict

3. **Test key expiration:**
   - Send request with key
   - Wait for TTL to expire
   - Send again with same key
   - Verify new payment created

### Rate Limiting Tests:

1. **Test limit enforcement:**
   - Send 101 requests in 1 minute
   - Verify 101st request gets 429

2. **Test window reset:**
   - Hit rate limit
   - Wait for window to reset
   - Verify requests allowed again

3. **Test different identifiers:**
   - Test per-user limits
   - Test per-IP limits
   - Verify isolation between users

---

## 📈 Success Metrics

### Idempotency:
- ✅ Zero duplicate payments
- ✅ < 10ms overhead for key lookup
- ✅ 100% replay accuracy
- ✅ Proper handling of concurrent requests

### Rate Limiting:
- ✅ 429 responses for exceeded limits
- ✅ Proper rate limit headers
- ✅ < 5ms overhead per request
- ✅ No false positives

---

## 🎨 UI Updates

### Rate Limiting Page Enhancements:
- Real-time rate limit statistics
- Top rate-limited users/IPs
- Rate limit violations over time
- Current limits and usage per user

### New Idempotency Dashboard:
- Total idempotent requests
- Cache hit rate
- Duplicate prevention count
- Key usage distribution

---

## 📝 API Documentation Updates

### Idempotency:
```markdown
## Idempotency

All POST endpoints support idempotency keys to prevent duplicate operations.

**Header:** `Idempotency-Key: <unique-string>`

**Example:**
```http
POST /payments
Idempotency-Key: payment-2024-01-15-abc123
Content-Type: application/json

{
  "user_id": "user_123",
  "amount": 100.00
}
```

**Response Headers:**
- `X-Idempotency-Replay: true` - Response was cached
- `X-Idempotency-Replay: false` - New request processed

**Key Requirements:**
- Must be unique per operation
- Recommended format: `{operation}-{date}-{uuid}`
- Keys expire after 24 hours
```

### Rate Limiting:
```markdown
## Rate Limiting

API requests are rate limited to prevent abuse.

**Limits:**
- 100 requests per minute per user
- 200 requests per minute per IP

**Response Headers:**
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining in window
- `X-RateLimit-Reset` - Unix timestamp when limit resets

**429 Response:**
```json
{
  "error": "Rate limit exceeded",
  "limit": 100,
  "remaining": 0,
  "reset_at": 1234567890
}
```
```

---

## 🔜 Next Steps After Week 4

Week 5 will focus on:
- Advanced caching strategies
- Multi-worker scaling
- Worker health monitoring
- Performance optimization

---

## 📚 Resources

### Idempotency:
- [Stripe Idempotency Guide](https://stripe.com/docs/api/idempotent_requests)
- [RFC 7231 - Safe Methods](https://tools.ietf.org/html/rfc7231#section-4.2.1)

### Rate Limiting:
- [Redis Rate Limiting Patterns](https://redis.io/docs/manual/patterns/rate-limiter/)
- [RFC 6585 - 429 Status Code](https://tools.ietf.org/html/rfc6585#section-4)

---

**Ready to implement Week 4? Let's build production-grade payment protection! 🚀**