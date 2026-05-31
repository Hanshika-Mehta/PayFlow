# Rate Limiting Configuration for Load Testing

## 🚨 The Problem

Your current rate limits:
- **Per User:** 100 requests/minute
- **Per IP:** 400 requests/minute

For bulk testing with **10,000+ requests**, you'll hit these limits and get blocked!

---

## ✅ Solution: Two Approaches

### **Option 1: Disable Rate Limiting (Recommended for Load Testing)**

This lets you test the core system without rate limit interference.

**Steps:**

1. **Create/Update your `.env` file:**
```bash
# In your project root (not load-tests folder)
cd /Users/hanshikamehta/Documents/Payflow
```

2. **Add this line to `.env`:**
```bash
RATE_LIMIT_ENABLED=false
```

3. **Restart your API:**
```bash
# Stop the current API (Ctrl+C)
# Then restart
python -m uvicorn app.main:app --reload
```

4. **Run your tests:**
```bash
cd load-tests
python bulk_load_test.py
```

5. **After testing, re-enable rate limiting:**
```bash
# In .env
RATE_LIMIT_ENABLED=true
```

---

### **Option 2: Increase Limits Temporarily**

Keep rate limiting enabled but with much higher limits.

**Steps:**

1. **Update `.env`:**
```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_USER=10000
RATE_LIMIT_PER_IP=50000
RATE_LIMIT_WINDOW=60
```

2. **Restart API:**
```bash
python -m uvicorn app.main:app --reload
```

3. **Run tests:**
```bash
cd load-tests
python bulk_load_test.py
```

4. **After testing, restore original limits:**
```bash
RATE_LIMIT_PER_USER=100
RATE_LIMIT_PER_IP=400
```

---

## 🎯 Which Option to Choose?

### Use **Option 1** (Disable) if:
- ✅ You want to test pure system capacity
- ✅ You want to focus on queue, retry, idempotency
- ✅ You'll test rate limiting separately

### Use **Option 2** (Increase) if:
- ✅ You want to keep rate limiting active
- ✅ You want to test the full stack together
- ✅ You want realistic production-like behavior

---

## 🧪 Testing Rate Limiting Separately

The bulk test includes a **dedicated rate limiting test** that:
- Uses only 10 test users
- Each makes 150 requests (exceeds 100/min limit)
- Validates that 429 responses are returned

**To test rate limiting properly:**

1. **Enable rate limiting with normal limits:**
```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_USER=100
RATE_LIMIT_PER_IP=400
```

2. **Run ONLY the rate limit portion:**
```python
# Create a separate test file: rate_limit_test.py
import asyncio
import aiohttp

async def test_rate_limiting():
    url = "http://localhost:8000/payments"
    user_id = "rate_test_user"
    
    async with aiohttp.ClientSession() as session:
        success = 0
        rate_limited = 0
        
        # Make 150 requests rapidly
        for i in range(150):
            payload = {"user_id": user_id, "amount": 100}
            headers = {"Idempotency-Key": f"rate_test_{i}"}
            
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status == 201:
                    success += 1
                elif response.status == 429:
                    rate_limited += 1
        
        print(f"Success: {success}")
        print(f"Rate Limited: {rate_limited}")
        print(f"Expected ~50 rate limited (150 - 100 limit)")

asyncio.run(test_rate_limiting())
```

---

## 📋 Recommended Testing Workflow

### Phase 1: Core System Testing (Disable Rate Limiting)
```bash
# .env
RATE_LIMIT_ENABLED=false
```

**Run:**
- Simple load test (1,000 payments)
- Bulk load test (10,000 payments)
- Focus on: throughput, latency, queue, retry, idempotency

---

### Phase 2: Rate Limiting Testing (Enable with Normal Limits)
```bash
# .env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_USER=100
RATE_LIMIT_PER_IP=400
```

**Run:**
- Dedicated rate limit test
- Verify 429 responses
- Check rate limit headers

---

### Phase 3: Full Integration (Enable with High Limits)
```bash
# .env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_USER=10000
RATE_LIMIT_PER_IP=50000
```

**Run:**
- Full bulk test with all features
- Verify everything works together

---

## 🔧 Quick Commands

### Check Current Rate Limit Status
```bash
# Check Redis for rate limit keys
redis-cli
> KEYS rate_limit:*
> TTL rate_limit:user:user_123
```

### Clear Rate Limit Counters
```bash
redis-cli
> DEL rate_limit:user:user_123
> DEL rate_limit:ip:127.0.0.1
```

### Monitor Rate Limiting in Real-Time
```bash
# Watch rate limit keys being created
redis-cli --scan --pattern "rate_limit:*"
```

---

## 💡 Pro Tips

1. **For load testing:** Disable rate limiting to test pure capacity
2. **For rate limit testing:** Use small, focused tests with normal limits
3. **For production simulation:** Enable with realistic limits
4. **Always document:** Which configuration you used for each test
5. **Reset between tests:** Clear Redis keys to start fresh

---

## 🎯 My Recommendation

**For your first bulk load test:**

```bash
# In your .env file
RATE_LIMIT_ENABLED=false
```

**Why?**
- You want to test the core system (queue, retry, idempotency)
- Rate limiting is a separate concern
- You can test it independently later
- Cleaner results without rate limit interference

**After bulk testing succeeds, then:**
- Re-enable rate limiting
- Run dedicated rate limit tests
- Verify it works as expected

---

## 📝 Example .env for Load Testing

```bash
# Application
APP_NAME=PayFlow
DEBUG=true

# Database
DATABASE_URL=postgresql://payflow_user:payflow_pass@localhost:5432/payflow_db

# Redis
REDIS_URL=redis://localhost:6379

# Retry Configuration
MAX_RETRIES=3
RETRY_BASE_DELAY=1
RETRY_MAX_DELAY=60

# Failure Simulation
FAILURE_RATE=0.3
ENABLE_FAILURE_SIMULATION=true

# DLQ Configuration
DLQ_STREAM_NAME=payment_dlq
DLQ_MAX_LENGTH=10000

# Idempotency Configuration
IDEMPOTENCY_ENABLED=true
IDEMPOTENCY_KEY_TTL=86400
IDEMPOTENCY_KEY_HEADER=Idempotency-Key

# Rate Limiting Configuration - DISABLED FOR LOAD TESTING
RATE_LIMIT_ENABLED=false
RATE_LIMIT_PER_USER=100
RATE_LIMIT_PER_IP=400
RATE_LIMIT_WINDOW=60
```

---

**Ready to test? Set `RATE_LIMIT_ENABLED=false` and run your bulk tests!** 🚀