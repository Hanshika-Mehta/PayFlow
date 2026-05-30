# Week 3 Implementation Guide: Retry Mechanism + Dead Letter Queue

## Overview

Week 3 adds production-grade retry mechanisms with exponential backoff and Dead Letter Queue (DLQ) handling to the PayFlow payment processing system.

## 🎯 Features Implemented

### 1. **Retry Mechanism with Exponential Backoff**
- Automatic retry of failed payments
- Exponential backoff strategy: 1s, 2s, 4s, 8s, 16s
- Configurable max retry attempts (default: 3)
- Retry scheduling with `next_retry_at` timestamp

### 2. **Dead Letter Queue (DLQ)**
- Separate Redis stream for permanently failed payments
- Automatic movement after max retries exceeded
- Manual retry capability from DLQ
- DLQ statistics and monitoring

### 3. **Enhanced Error Handling**
- Multiple error types simulation:
  - `GATEWAY_TIMEOUT`
  - `NETWORK_ERROR`
  - `INSUFFICIENT_FUNDS`
  - `INVALID_PAYMENT_METHOD`
- Error tracking in database
- Error type distribution analytics

### 4. **Monitoring & Observability**
- Real-time retry statistics
- DLQ monitoring dashboard
- Error type distribution
- Retry count analytics

---

## 📊 Architecture Changes

### Database Schema Updates

New fields added to `payments` table:

```sql
-- Retry tracking
max_retries INTEGER DEFAULT 3
last_error TEXT
error_type VARCHAR(100)
next_retry_at TIMESTAMP

-- DLQ tracking
moved_to_dlq_at TIMESTAMP
```

### Redis Streams

1. **Payment Queue**: `payment_queue`
   - Primary queue for payment processing
   - Consumer group: `payment_workers`

2. **Dead Letter Queue**: `payment_dlq`
   - Stores permanently failed payments
   - Max length: 10,000 messages

---

## 🔧 Configuration

### Environment Variables

Add to `.env`:

```bash
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
```

---

## 🚀 Getting Started

### 1. Database Migration

Run the migration script to add new columns:

```bash
psql -U your_user -d payflow < scripts/migrate_week3.sql
```

Or let SQLAlchemy auto-create them:

```bash
# The new columns will be created automatically when you start the app
python app/main.py
```

### 2. Start the Services

**Terminal 1 - Backend API:**
```bash
./scripts/run_app.sh
```

**Terminal 2 - Worker:**
```bash
./scripts/run_worker.sh
```

**Terminal 3 - Frontend:**
```bash
./scripts/run_frontend.sh
```

### 3. Access the UI

- **Retry Monitor**: http://localhost:5173/retries
- **DLQ Monitor**: http://localhost:5173/dlq
- **API Docs**: http://localhost:8000/docs

---

## 📡 API Endpoints

### Retry Statistics

```http
GET /monitoring/retry-stats
```

**Response:**
```json
{
  "total_payments_with_retries": 45,
  "retry_count_distribution": {
    "1": 20,
    "2": 15,
    "3": 10
  },
  "pending_retry": 8,
  "ready_for_retry": 3,
  "average_retry_count": 1.67,
  "error_type_distribution": {
    "GATEWAY_TIMEOUT": 15,
    "NETWORK_ERROR": 12,
    "INSUFFICIENT_FUNDS": 10
  },
  "recent_failures": [...]
}
```

### DLQ Statistics

```http
GET /monitoring/dlq/stats
```

**Response:**
```json
{
  "dlq_name": "payment_dlq",
  "total_messages": 12,
  "error_type_distribution": {
    "GATEWAY_TIMEOUT": 5,
    "NETWORK_ERROR": 4,
    "INSUFFICIENT_FUNDS": 3
  },
  "recent_messages": [...]
}
```

### Get DLQ Messages

```http
GET /monitoring/dlq?count=100&start_id=-
```

### Retry from DLQ

```http
POST /monitoring/dlq/{payment_id}/retry
```

**Response:**
```json
{
  "message": "Payment {payment_id} reset and republished for retry",
  "payment_id": "uuid",
  "status": "PENDING"
}
```

---

## 🔄 Retry Flow

### Payment Lifecycle with Retries

```
1. Payment Created (PENDING)
   ↓
2. Added to Queue
   ↓
3. Worker Processes (PROCESSING)
   ↓
4. Processing Result:
   
   SUCCESS → Payment Complete ✓
   
   FAILURE → Check Retry Count
      ↓
      retry_count < max_retries?
      ↓
      YES → Schedule Retry (exponential backoff)
      |     - Calculate delay: 2^(retry_count) seconds
      |     - Set next_retry_at timestamp
      |     - Keep in queue
      ↓
      NO → Move to DLQ
           - Status = "DLQ"
           - Set moved_to_dlq_at
           - Add to payment_dlq stream
```

### Exponential Backoff Formula

```python
delay = min(base_delay * (2 ** retry_count), max_delay)

# Examples:
# Attempt 1: 1 * (2^0) = 1 second
# Attempt 2: 1 * (2^1) = 2 seconds
# Attempt 3: 1 * (2^2) = 4 seconds
# Attempt 4: 1 * (2^3) = 8 seconds
# Attempt 5: 1 * (2^4) = 16 seconds
```

---

## 🧪 Testing the Implementation

### Test Scenario 1: Successful Retry

1. Create a payment
2. Payment fails (30% chance with simulation)
3. Worker automatically retries after delay
4. Payment succeeds on retry

**Expected Behavior:**
- Payment status: PENDING → PROCESSING → FAILED → PROCESSING → SUCCESS
- `retry_count` increments
- `next_retry_at` set and cleared
- Visible in Retry Monitor

### Test Scenario 2: Move to DLQ

1. Create a payment
2. Payment fails 3 times consecutively
3. After 3rd failure, moved to DLQ

**Expected Behavior:**
- Payment status: FAILED → DLQ
- `moved_to_dlq_at` timestamp set
- Appears in DLQ Monitor
- Can be manually retried

### Test Scenario 3: Manual Retry from DLQ

1. Find payment in DLQ Monitor
2. Click "Retry" button
3. Payment reset and reprocessed

**Expected Behavior:**
- Payment status: DLQ → PENDING
- `retry_count` reset to 0
- Republished to queue
- Worker processes again

---

## 📈 Monitoring

### Key Metrics to Watch

1. **Retry Rate**: `total_payments_with_retries / total_payments`
2. **Recovery Rate**: `successful_retries / total_retries`
3. **DLQ Growth**: Monitor `total_messages` in DLQ
4. **Error Distribution**: Track most common error types
5. **Average Retry Count**: Indicates system stability

### Alerts to Configure

- DLQ size > 100 messages (investigate systemic issues)
- Retry rate > 50% (upstream service degradation)
- Specific error type spike (targeted investigation)

---

## 🎨 UI Components

### Retry Monitor (`/retries`)

**Features:**
- Real-time retry statistics
- Recent failures list with countdown timers
- Error type distribution chart
- Exponential backoff visualization
- Auto-refresh every 5 seconds

### DLQ Monitor (`/dlq`)

**Features:**
- Total DLQ messages count
- Failed payments list with details
- Manual retry button per payment
- Error distribution analytics
- Auto-refresh every 10 seconds

---

## 🔍 Troubleshooting

### Issue: Payments stuck in FAILED status

**Cause**: Worker not processing retries

**Solution:**
1. Check worker is running: `ps aux | grep payment_worker`
2. Check worker logs for errors
3. Verify `next_retry_at` is in the past
4. Restart worker: `./scripts/run_worker.sh`

### Issue: DLQ growing rapidly

**Cause**: Systemic failure in payment processing

**Solution:**
1. Check error type distribution in DLQ
2. Investigate most common error
3. Fix upstream issue
4. Manually retry payments from DLQ

### Issue: Retries not respecting backoff delay

**Cause**: Worker processing too quickly

**Solution:**
1. Check worker logic for `next_retry_at` comparison
2. Verify system time is correct
3. Check Redis time synchronization

---

## 🏗️ Code Structure

```
app/
├── models/
│   └── payment.py              # Updated with retry fields
├── services/
│   ├── payment_processor.py    # Retry logic + failure simulation
│   ├── dlq_service.py          # DLQ management (NEW)
│   └── queue_service.py        # Queue operations
├── workers/
│   └── payment_worker.py       # Enhanced with retry handling
└── api/
    └── retry_monitoring.py     # Retry & DLQ endpoints (NEW)

frontend/src/
├── pages/
│   ├── RetryMonitor.tsx        # Updated with real data
│   └── DLQMonitor.tsx          # DLQ dashboard (NEW)
└── components/
    └── Sidebar.tsx             # Added DLQ link

scripts/
└── migrate_week3.sql           # Database migration (NEW)
```

---

## 🎓 Key Learnings

### 1. **Exponential Backoff**
- Prevents overwhelming failing services
- Gives systems time to recover
- Industry standard for retry mechanisms

### 2. **Dead Letter Queue**
- Prevents infinite retry loops
- Isolates problematic messages
- Enables manual intervention

### 3. **Error Classification**
- Different errors need different handling
- Transient vs permanent failures
- Helps identify systemic issues

### 4. **Observability**
- Real-time monitoring crucial
- Error distribution reveals patterns
- Metrics guide operational decisions

---

## 📚 Next Steps (Week 4)

1. **Idempotency Keys**
   - Prevent duplicate payments
   - Handle client retries safely

2. **Rate Limiting**
   - Protect against abuse
   - Per-user request limits

3. **Advanced Caching**
   - Reduce database load
   - Improve response times

---

## 🤝 Contributing

When adding new error types:

1. Add to `PaymentProcessor.ERROR_TYPES`
2. Update error handling in worker
3. Test retry behavior
4. Update monitoring dashboards

---

## 📝 Summary

Week 3 implementation adds production-grade reliability features:

✅ Automatic retry with exponential backoff
✅ Dead Letter Queue for failed payments
✅ Comprehensive error tracking
✅ Real-time monitoring dashboards
✅ Manual intervention capabilities

The system now handles transient failures gracefully while isolating permanent failures for investigation.

---

**Made with ❤️ by Bob**