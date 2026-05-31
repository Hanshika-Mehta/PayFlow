# Idempotency Troubleshooting - Step-by-Step Action Plan

## 🎯 Goal
Fix the idempotency issue where duplicate requests with the same key return different payment IDs.

---

## 📋 Pre-Flight Checks

### 1. Check Redis is Running
```bash
redis-cli ping
# Expected: PONG
```

### 2. Check Backend is Running
```bash
ps aux | grep uvicorn
# Should show: uvicorn app.main:app
```

### 3. Check Configuration
```bash
cat .env | grep -i redis
cat .env | grep -i idempotency
```

Expected values:
- `REDIS_URL=redis://localhost:6379/0`
- `IDEMPOTENCY_ENABLED=true`

---

## 🧪 Testing Steps

### Step 1: Clear Redis Cache
```bash
redis-cli FLUSHALL
echo "✅ Redis cache cleared"
```

### Step 2: Restart Backend
```bash
# Stop backend
pkill -f "uvicorn"

# Start backend with logging
cd /Users/hanshikamehta/Documents/Payflow
source venv/bin/activate
uvicorn app.main:app --reload --log-level debug
```

### Step 3: Run Test Script
```bash
# In a new terminal
cd /Users/hanshikamehta/Documents/Payflow
./test_idempotency.sh
```

### Step 4: Check Results
The script will show:
- ✅ SUCCESS: Both requests returned the same payment ID
- ❌ FAILED: Different payment IDs returned

---

## 🔍 Debugging Based on Results

### If Test PASSES ✅
The backend is working! The issue is in the frontend.

**Action:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Create payment with idempotency key
4. Check request headers - verify `Idempotency-Key` is present
5. Create another payment with SAME key
6. Verify both requests have identical `Idempotency-Key` header

### If Test FAILS ❌
The backend has an issue.

**Check these in order:**

#### A. Check Backend Logs
```bash
# Look for idempotency-related logs
tail -100 logs/api.log | grep -i idempotency

# Or watch in real-time
tail -f logs/api.log | grep -i idempotency
```

Expected logs:
```
INFO: Idempotency key received: test-key-123
INFO: No cached response found
INFO: Marking as processing: test-key-123
INFO: Successfully cached response for idempotency key: test-key-123
```

#### B. Check Redis Keys
```bash
# After first request
redis-cli KEYS "idem:*"

# Should show:
# 1) "idem:response:test-key-123"
# 2) "idem:processing:test-key-123"
```

#### C. Check Cached Data
```bash
# Get cached response
redis-cli GET "idem:response:test-key-123"

# Should show JSON like:
# {"payment_id":"550e8400-e29b-41d4-a716-446655440000","status":"PENDING"}
```

#### D. Check TTL
```bash
redis-cli TTL "idem:response:test-key-123"

# Should show: 86400 (24 hours)
```

---

## 🐛 Common Issues and Fixes

### Issue 1: No Redis Keys Created
**Symptom:** `redis-cli KEYS "idem:*"` returns empty

**Possible Causes:**
1. Redis not connected
2. Middleware not running
3. Cache write failing

**Fix:**
```bash
# Check Redis connection in Python
python3 << EOF
from app.core.redis_client import redis_client
print(redis_client.ping())
EOF
```

### Issue 2: Keys Created But Not Retrieved
**Symptom:** Keys exist but second request creates new payment

**Possible Causes:**
1. Cache read failing
2. Key mismatch
3. Middleware order wrong

**Fix:**
Check middleware order in `app/main.py`:
```python
app.add_middleware(CORSMiddleware, ...)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(IdempotencyMiddleware)  # Should be last
```

### Issue 3: Response Body Not Cached
**Symptom:** Processing key exists but response key doesn't

**Possible Causes:**
1. Response body reading failed
2. JSON parsing failed
3. Cache write failed

**Fix:**
Check logs for errors:
```bash
tail -100 logs/api.log | grep -i "error\|warning"
```

---

## 🔧 Manual Testing with cURL

### Test 1: Basic Idempotency
```bash
# Request 1
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: manual-test-001" \
  -d '{"user_id": "user_test", "amount": 100}' \
  -v 2>&1 | tee request1.log

# Extract payment_id
PAYMENT_ID_1=$(grep -o '"payment_id":"[^"]*"' request1.log | cut -d'"' -f4)
echo "Payment ID 1: $PAYMENT_ID_1"

# Wait 2 seconds
sleep 2

# Request 2 (same key)
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: manual-test-001" \
  -d '{"user_id": "user_test", "amount": 100}' \
  -v 2>&1 | tee request2.log

# Extract payment_id
PAYMENT_ID_2=$(grep -o '"payment_id":"[^"]*"' request2.log | cut -d'"' -f4)
echo "Payment ID 2: $PAYMENT_ID_2"

# Compare
if [ "$PAYMENT_ID_1" == "$PAYMENT_ID_2" ]; then
    echo "✅ SUCCESS: Same payment ID"
else
    echo "❌ FAILED: Different payment IDs"
fi
```

### Test 2: Check Response Headers
```bash
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: header-test-002" \
  -d '{"user_id": "user_test", "amount": 200}' \
  -i

# Look for:
# X-Idempotency-Replay: false (first request)
# X-Idempotency-Key: header-test-002

# Second request
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: header-test-002" \
  -d '{"user_id": "user_test", "amount": 200}' \
  -i

# Look for:
# X-Idempotency-Replay: true (cached response)
# X-Idempotency-Key: header-test-002
```

---

## 📊 Expected Behavior Summary

### First Request (New Key)
1. Middleware receives key
2. Checks cache → MISS
3. Marks as processing
4. Processes request → Creates payment
5. Caches response
6. Returns response with `X-Idempotency-Replay: false`

### Second Request (Same Key)
1. Middleware receives key
2. Checks cache → HIT
3. Returns cached response immediately
4. Response has `X-Idempotency-Replay: true`
5. **Same payment_id as first request**

---

## 🎬 Next Steps

1. **Run the automated test:**
   ```bash
   ./test_idempotency.sh
   ```

2. **If it fails, collect this info:**
   - Backend logs: `tail -100 logs/api.log`
   - Redis keys: `redis-cli KEYS "idem:*"`
   - Redis data: `redis-cli GET "idem:response:YOUR-KEY"`
   - Configuration: `cat .env | grep -i idempotency`

3. **Share the results** so we can identify the exact issue

---

## 📞 Quick Diagnostic Commands

Run all these and share the output:

```bash
echo "=== Redis Status ==="
redis-cli ping

echo -e "\n=== Redis Keys ==="
redis-cli KEYS "idem:*"

echo -e "\n=== Backend Process ==="
ps aux | grep uvicorn

echo -e "\n=== Configuration ==="
cat .env | grep -E "REDIS|IDEMPOTENCY"

echo -e "\n=== Recent Logs ==="
tail -50 logs/api.log | grep -i idempotency
```

---

**Made with Bob** 🤖