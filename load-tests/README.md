# PayFlow Load Testing Suite

Comprehensive load testing scripts to validate your Week 1-4 implementation (Core APIs, Redis Queue, Retry/DLQ, Idempotency, Rate Limiting).

## 📋 Prerequisites

1. **Install dependencies:**
```bash
cd load-tests
pip install -r requirements.txt
```

2. **Ensure services are running:**
```bash
# Terminal 1: Start PostgreSQL
docker-compose up postgres

# Terminal 2: Start Redis
docker-compose up redis

# Terminal 3: Start FastAPI
python -m uvicorn app.main:app --reload

# Terminal 4: Start Worker
python -m app.workers.payment_worker
```

## 🚀 Test Scripts

### 1. Simple Load Test (Quick Validation)
**Purpose:** Quick validation with 1,000 payments  
**Duration:** ~30 seconds  
**Use when:** You want to quickly verify the system works

```bash
python simple_load_test.py
```

**What it tests:**
- Basic API functionality
- Response times
- Success rate
- Throughput (req/s)

---

### 2. Bulk Load Test (Comprehensive)
**Purpose:** Full stress test with 10,000+ payments  
**Duration:** ~5-10 minutes  
**Use when:** You want comprehensive testing of all features

```bash
python bulk_load_test.py
```

**What it tests:**
- ✅ **Bulk Creation:** 10,000 payments with 100 concurrent workers
- ✅ **Idempotency:** 20% duplicate requests to test cache hits
- ✅ **Rate Limiting:** Exceeds limits to trigger 429 responses
- ✅ **Concurrent Load:** Simulates real-world traffic patterns
- ✅ **Worker Processing:** Verifies async processing works
- ✅ **Response Times:** P50, P95, P99 latencies

**Output:**
- Console summary with detailed metrics
- JSON file: `load_test_results_YYYYMMDD_HHMMSS.json`

---

### 3. Queue Monitor (Real-time Monitoring)
**Purpose:** Monitor queue, workers, DLQ, and retries during tests  
**Duration:** Continuous (Ctrl+C to stop)  
**Use when:** Running load tests to see real-time metrics

```bash
# Continuous monitoring (5s interval, 5min duration)
python queue_monitor.py

# Custom interval and duration
python queue_monitor.py 10 300  # 10s interval, 300s duration

# Single snapshot
python queue_monitor.py snapshot
```

**What it monitors:**
- 📊 Queue: Pending, processing, lag
- ⚙️ Workers: Active count, throughput, success rate
- 💀 DLQ: Failed messages
- 🔄 Retries: Retry count and rate

---

## 📊 Recommended Testing Workflow

### Step 1: Quick Validation
```bash
# Start monitoring in one terminal
python queue_monitor.py

# Run simple test in another terminal
python simple_load_test.py
```

**Expected Results:**
- ✅ 95%+ success rate
- ✅ <100ms average response time
- ✅ >50 req/s throughput

---

### Step 2: Comprehensive Load Test
```bash
# Start monitoring
python queue_monitor.py 5 600  # Monitor for 10 minutes

# In another terminal, run bulk test
python bulk_load_test.py
```

**Expected Results:**
- ✅ 10,000+ payments created
- ✅ Idempotency cache hits detected
- ✅ Rate limiting triggers (429 responses)
- ✅ Workers process queue successfully
- ✅ DLQ captures permanent failures
- ✅ Retry mechanism works

---

## 🎯 Key Metrics to Watch

### 1. **Throughput**
- **Target:** >100 req/s for bulk creation
- **Bottleneck if low:** Database writes, Redis connections

### 2. **Response Times**
- **P50 (Median):** <50ms
- **P95:** <200ms
- **P99:** <500ms
- **Bottleneck if high:** Database queries, Redis latency

### 3. **Success Rate**
- **Target:** >95% (accounting for simulated failures)
- **Issue if low:** Worker crashes, database errors

### 4. **Queue Lag**
- **Target:** <5 seconds
- **Issue if high:** Workers too slow, need scaling

### 5. **Idempotency Hit Rate**
- **Expected:** ~20% (based on duplicate rate)
- **Issue if 0%:** Idempotency not working

### 6. **Rate Limiting**
- **Expected:** 429 responses when limit exceeded
- **Issue if none:** Rate limiting not working

---

## 🔍 Analyzing Results

### Good Results Example:
```
📊 OVERALL METRICS
   Duration: 45.23s
   Total Requests: 11,150
   Successful: 10,892 (97.69%)
   Failed: 258
   Throughput: 246.52 req/s

⚡ RESPONSE TIMES
   Avg: 42.15ms
   P95: 156.23ms
   P99: 289.45ms

🔒 RELIABILITY FEATURES
   Rate Limited: 150
   Idempotency Hits: 2,230
   Unique Payments: 8,920
```

### Issues to Investigate:

**1. Low Throughput (<50 req/s)**
- Check database connection pool size
- Check Redis connection limits
- Monitor CPU/memory usage

**2. High Response Times (P95 >500ms)**
- Add database indexes
- Optimize queries
- Consider caching (Week 5)

**3. High Failure Rate (>10%)**
- Check worker logs
- Verify database connectivity
- Check Redis availability

**4. Queue Lag (>10s)**
- Scale workers (Week 5: Multi-worker)
- Optimize worker processing
- Check for blocking operations

**5. No Idempotency Hits**
- Verify middleware is enabled
- Check Redis idempotency keys
- Review header passing

**6. No Rate Limiting**
- Verify middleware is enabled
- Check Redis rate limit keys
- Review configuration

---

## 🐛 Troubleshooting

### Connection Refused
```bash
# Check if services are running
docker ps
curl http://localhost:8000/docs

# Restart services
docker-compose restart
```

### Import Errors
```bash
# Install dependencies
pip install -r requirements.txt
```

### Worker Not Processing
```bash
# Check worker logs
python -m app.workers.payment_worker

# Check Redis queue
redis-cli
> XLEN payment_stream
```

### Database Errors
```bash
# Check PostgreSQL
docker-compose logs postgres

# Verify connection
psql -h localhost -U payflow_user -d payflow_db
```

---

## 📈 Next Steps After Testing

Based on your results, you'll know what to implement next:

### If Queue Lag is High:
→ **Week 5:** Implement multi-worker scaling

### If Response Times are High:
→ **Week 5:** Add caching layer

### If You Want Better Visibility:
→ **Week 7:** Add Prometheus + Grafana monitoring

### If Everything Looks Good:
→ **Week 6:** Dockerize and run full stack tests

---

## 💡 Tips

1. **Run tests multiple times** to get consistent results
2. **Monitor system resources** (CPU, memory, disk I/O)
3. **Check logs** for errors during tests
4. **Compare results** before and after optimizations
5. **Save test results** to track improvements over time

---

## 📝 Test Results Template

Document your findings:

```markdown
## Load Test Results - [Date]

### Configuration
- Total Payments: 10,000
- Concurrent Users: 100
- Test Duration: 45s

### Results
- Throughput: 246 req/s
- Success Rate: 97.69%
- Avg Response Time: 42ms
- P95 Response Time: 156ms
- Idempotency Hits: 2,230
- Rate Limited: 150

### Bottlenecks Identified
1. Queue lag increases after 5,000 payments
2. P99 latency spikes during rate limit tests

### Action Items
1. Scale to 3 workers (Week 5)
2. Add database connection pooling
3. Optimize payment processing logic
```

---

## 🎓 What You'll Learn

By running these tests, you'll understand:

1. **System Limits:** How many req/s your system can handle
2. **Bottlenecks:** Where performance degrades
3. **Reliability:** How well retry/DLQ/idempotency work
4. **Scalability:** Whether you need multi-worker (Week 5)
5. **Real-world Behavior:** How the system performs under load

---

**Good luck with your load testing! 🚀**

*These tests will give you data-driven insights to guide your Week 5-7 implementation.*