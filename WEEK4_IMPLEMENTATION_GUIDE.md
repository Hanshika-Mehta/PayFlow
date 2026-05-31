# Week 4 Implementation Guide: Idempotency + Rate Limiting

## 🎯 Overview

Week 4 implements two critical production features:
1. **Idempotency** - Prevents duplicate payments when clients retry requests
2. **Rate Limiting** - Protects API from abuse using Redis counters

## 📋 What Was Implemented

### Backend Components

#### 1. Configuration (`app/core/config.py`)
Added settings for both features:
```python
# Idempotency Settings
IDEMPOTENCY_ENABLED: bool = True
IDEMPOTENCY_KEY_TTL: int = 86400  # 24 hours

# Rate Limiting Settings
RATE_LIMIT_ENABLED: bool = True
RATE_LIMIT_PER_USER: int = 100    # requests per minute
RATE_LIMIT_PER_IP: int = 200      # requests per minute
```

#### 2. Idempotency Service (`app/services/idempotency_service.py`)
**Purpose**: Manages idempotency keys and cached responses

**Key Methods**:
- `get_cached_response(key)` - Retrieves cached response for duplicate requests
- `cache_response(key, response, ttl)` - Stores response with 24-hour TTL
- `mark_processing(key)` - Prevents concurrent processing of same request
- `clear_processing(key)` - Clears processing lock
- `get_stats()` - Returns usage statistics

**Redis Keys Used**:
- `idem:response:{key}` - Stores cached responses
- `idem:processing:{key}` - Locks during processing

#### 3. Rate Limiting Service (`app/services/rate_limit_service.py`)
**Purpose**: Enforces rate limits using sliding window algorithm

**Key Methods**:
- `check_rate_limit(identifier, limit, window)` - Generic rate limit check
- `check_user_rate_limit(user_id)` - Per-user limiting (100 req/min)
- `check_ip_rate_limit(ip_address)` - Per-IP limiting (200 req/min)
- `get_stats()` - Returns usage statistics

**Redis Keys Used**:
- `rate_limit:user:{user_id}` - User request counters
- `rate_limit:ip:{ip_address}` - IP request counters

**Algorithm**: Sliding window with Redis INCR + EXPIRE

#### 4. Idempotency Middleware (`app/middleware/idempotency.py`)
**Purpose**: Intercepts POST requests to handle idempotency

**Flow**:
1. Check for `Idempotency-Key` header
2. If key exists, check cache for previous response
3. If cached, return stored response (replay)
4. If not cached, mark as processing
5. Process request normally
6. Cache response for future requests
7. Add headers: `X-Idempotency-Replay`, `X-Idempotency-Key`

**Headers**:
- Request: `Idempotency-Key: <unique-key>`
- Response: `X-Idempotency-Replay: true/false`
- Response: `X-Idempotency-Key: <key>`

#### 5. Rate Limiting Middleware (`app/middleware/rate_limiting.py`)
**Purpose**: Enforces rate limits on all requests

**Flow**:
1. Extract client IP and user ID
2. Check IP rate limit (200 req/min)
3. Check user rate limit (100 req/min)
4. If exceeded, return 429 Too Many Requests
5. If allowed, process request and add rate limit headers

**Response Headers**:
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining in window
- `X-RateLimit-Reset` - Timestamp when limit resets
- `Retry-After` - Seconds to wait before retrying (on 429)

#### 6. Advanced Monitoring API (`app/api/advanced_monitoring.py`)
**New Endpoints**:

**Idempotency Monitoring**:
- `GET /monitoring/idempotency-stats` - Overall statistics
- `GET /monitoring/idempotency-keys?limit=50` - List cached keys
- `DELETE /monitoring/idempotency-keys/{key}` - Delete specific key

**Rate Limiting Monitoring**:
- `GET /monitoring/rate-limit-stats` - Overall statistics
- `GET /monitoring/rate-limit-users?limit=50` - Active user limits
- `GET /monitoring/rate-limit-ips?limit=50` - Active IP limits
- `DELETE /monitoring/rate-limit-reset/{identifier}?limit_type=user` - Reset limit

**Combined**:
- `GET /monitoring/week4-summary` - Comprehensive Week 4 stats

#### 7. Main Application (`app/main.py`)
**Updates**:
- Registered idempotency middleware
- Registered rate limiting middleware
- Added advanced monitoring router
- Updated version to 3.0.0
- Updated description to "Week 4: Idempotency + Rate Limiting"

**Middleware Order** (important!):
1. CORS (first)
2. Rate Limiting (check limits before processing)
3. Idempotency (handle duplicates after rate check)

## 🔧 How It Works

### Idempotency Flow

```
Client Request with Idempotency-Key
         ↓
Check Redis Cache
         ↓
    ┌────┴────┐
    │         │
  Found    Not Found
    │         │
    ↓         ↓
Return    Mark Processing
Cached         ↓
Response   Process Request
    │         ↓
    │    Cache Response
    │         ↓
    └────┬────┘
         ↓
    Return Response
```

### Rate Limiting Flow

```
Incoming Request
      ↓
Extract IP & User ID
      ↓
Check IP Limit (200/min)
      ↓
  ┌───┴───┐
  │       │
Exceeded  OK
  │       ↓
  │   Check User Limit (100/min)
  │       ↓
  │   ┌───┴───┐
  │   │       │
  │ Exceeded  OK
  │   │       ↓
  │   │   Process Request
  │   │       ↓
  │   │   Add Headers
  │   │       │
  └───┴───────┘
      ↓
Return 429 or Response
```

## 🧪 Testing

### Test Idempotency

**1. Create payment with idempotency key:**
```bash
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-key-123" \
  -d '{"user_id": "user_1", "amount": 100}'
```

**2. Retry with same key (should return cached response):**
```bash
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-key-123" \
  -d '{"user_id": "user_1", "amount": 100}'
```

**Expected**: Same payment_id, `X-Idempotency-Replay: true` header

**3. Check idempotency stats:**
```bash
curl http://localhost:8000/monitoring/idempotency-stats
```

### Test Rate Limiting

**1. Send multiple requests rapidly:**
```bash
for i in {1..150}; do
  curl -X POST http://localhost:8000/payments \
    -H "Content-Type: application/json" \
    -d "{\"user_id\": \"user_1\", \"amount\": $i}"
done
```

**Expected**: First 100 succeed, then 429 errors

**2. Check rate limit headers:**
```bash
curl -I http://localhost:8000/payments
```

Look for:
- `X-RateLimit-Limit: 100`
- `X-RateLimit-Remaining: 99`
- `X-RateLimit-Reset: <timestamp>`

**3. Check rate limit stats:**
```bash
curl http://localhost:8000/monitoring/rate-limit-stats
```

## 📊 Monitoring Endpoints

### Idempotency Stats
```bash
# Get overall stats
curl http://localhost:8000/monitoring/idempotency-stats

# List cached keys
curl http://localhost:8000/monitoring/idempotency-keys?limit=20

# Delete specific key
curl -X DELETE http://localhost:8000/monitoring/idempotency-keys/test-key-123
```

### Rate Limit Stats
```bash
# Get overall stats
curl http://localhost:8000/monitoring/rate-limit-stats

# List rate-limited users
curl http://localhost:8000/monitoring/rate-limit-users?limit=20

# List rate-limited IPs
curl http://localhost:8000/monitoring/rate-limit-ips?limit=20

# Reset user rate limit
curl -X DELETE "http://localhost:8000/monitoring/rate-limit-reset/user_1?limit_type=user"

# Reset IP rate limit
curl -X DELETE "http://localhost:8000/monitoring/rate-limit-reset/192.168.1.1?limit_type=ip"
```

### Combined Stats
```bash
# Get Week 4 summary
curl http://localhost:8000/monitoring/week4-summary
```

## 🎨 Frontend Integration (Next Steps)

### 1. Update API Service (`frontend/src/services/api.ts`)
Add new endpoints:
```typescript
// Idempotency
export const getIdempotencyStats = () => api.get('/monitoring/idempotency-stats');
export const getIdempotencyKeys = (limit = 50) => 
  api.get(`/monitoring/idempotency-keys?limit=${limit}`);

// Rate Limiting
export const getRateLimitStats = () => api.get('/monitoring/rate-limit-stats');
export const getRateLimitUsers = (limit = 50) => 
  api.get(`/monitoring/rate-limit-users?limit=${limit}`);
export const getRateLimitIps = (limit = 50) => 
  api.get(`/monitoring/rate-limit-ips?limit=${limit}`);

// Combined
export const getWeek4Summary = () => api.get('/monitoring/week4-summary');
```

### 2. Create Idempotency Page (`frontend/src/pages/Idempotency.tsx`)
Display:
- Total cached responses
- Cache hit rate
- Recent idempotency keys
- Key details (TTL, status)
- Real-time updates

### 3. Update Rate Limiting Page (`frontend/src/pages/RateLimiting.tsx`)
Display:
- Active user limits
- Active IP limits
- Blocked requests count
- Top rate-limited users/IPs
- Real-time updates

### 4. Update Sidebar Navigation
Add:
- "Idempotency" link
- Update "Rate Limiting" to show real data

## 🔑 Key Concepts

### Idempotency
**Problem**: Client retries request → Duplicate payment
**Solution**: Use idempotency keys to detect and prevent duplicates
**Implementation**: Redis cache with 24-hour TTL

**Benefits**:
- Prevents duplicate charges
- Safe retries for clients
- Consistent responses
- Production-grade reliability

### Rate Limiting
**Problem**: API abuse, DDoS attacks, resource exhaustion
**Solution**: Limit requests per user/IP using Redis counters
**Implementation**: Sliding window algorithm with INCR + EXPIRE

**Benefits**:
- Protects against abuse
- Fair resource allocation
- Prevents system overload
- Production-grade security

## 📈 Redis Key Patterns

```
# Idempotency
idem:response:{key}     → Cached response (24h TTL)
idem:processing:{key}   → Processing lock (5min TTL)

# Rate Limiting
rate_limit:user:{id}    → User request count (60s TTL)
rate_limit:ip:{address} → IP request count (60s TTL)
```

## 🚀 Running the System

### 1. Start Backend
```bash
# Terminal 1: Start API
./scripts/run_app.sh

# Terminal 2: Start Worker
./scripts/run_worker.sh
```

### 2. Start Frontend
```bash
# Terminal 3: Start Frontend
./scripts/run_frontend.sh
```

### 3. Access
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Frontend: http://localhost:5173

## 🔍 Debugging

### Check Redis Keys
```bash
# Connect to Redis
redis-cli

# List idempotency keys
KEYS idem:*

# List rate limit keys
KEYS rate_limit:*

# Get specific key
GET idem:response:test-key-123

# Check TTL
TTL idem:response:test-key-123
```

### Check Logs
```bash
# API logs
tail -f logs/api.log

# Worker logs
tail -f logs/worker.log
```

## 📝 Configuration

### Environment Variables (.env)
```bash
# Idempotency
IDEMPOTENCY_ENABLED=true
IDEMPOTENCY_KEY_TTL=86400

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_USER=100
RATE_LIMIT_PER_IP=200
```

### Adjust Limits
Edit `app/core/config.py`:
```python
RATE_LIMIT_PER_USER: int = 100  # Change to 50, 200, etc.
RATE_LIMIT_PER_IP: int = 200    # Change as needed
```

## ✅ Verification Checklist

- [ ] Idempotency service created
- [ ] Rate limiting service created
- [ ] Both middlewares implemented
- [ ] Middlewares registered in main.py
- [ ] Monitoring endpoints created
- [ ] Configuration updated
- [ ] Can create payment with idempotency key
- [ ] Duplicate requests return cached response
- [ ] Rate limits enforced correctly
- [ ] 429 errors returned when limit exceeded
- [ ] Rate limit headers present
- [ ] Monitoring endpoints return data
- [ ] Redis keys created correctly
- [ ] TTLs set properly

## 🎓 Learning Outcomes

After Week 4, you understand:
- ✅ What idempotency is and why it matters
- ✅ How to prevent duplicate operations
- ✅ How rate limiting protects APIs
- ✅ Sliding window algorithm
- ✅ Redis for caching and counters
- ✅ Middleware patterns in FastAPI
- ✅ Production-grade API design
- ✅ Request/response headers
- ✅ Error handling (429 errors)
- ✅ Monitoring and observability

## 🔜 Next Steps (Week 5)

1. **Caching** - Reduce database load with Redis cache
2. **Multi-Worker Scaling** - Run multiple workers in parallel
3. **Consumer Groups** - Distribute work across workers
4. **Performance Optimization** - Improve throughput

## 📚 Additional Resources

- [Idempotency in APIs](https://stripe.com/docs/api/idempotent_requests)
- [Rate Limiting Algorithms](https://redis.io/glossary/rate-limiting/)
- [FastAPI Middleware](https://fastapi.tiangolo.com/tutorial/middleware/)
- [Redis Commands](https://redis.io/commands/)

---

**Made with Bob** 🤖