# Phase 2 - Week 2: Async Queue Architecture

## 🎯 Goal

Transform our synchronous payment system into an **asynchronous, queue-based architecture** that can handle high traffic and scale horizontally.

---

## 📊 Current vs Target Architecture

### Current (Synchronous)
```
Client → API → Database
         ↓
    (blocks until complete)
```

**Problems:**
- API blocks while processing payment
- Cannot handle high traffic
- Single point of failure
- No scalability

### Target (Asynchronous)
```
Client → API → Database (save PENDING)
              ↓
         Redis Queue (publish event)
              ↓
         Worker (consume event)
              ↓
         Process Payment
              ↓
         Database (update status)
```

**Benefits:**
- API responds immediately
- Workers process in background
- Can scale workers independently
- Fault tolerant
- High throughput

---

## 🔑 Key Concepts

### 1. **Redis Streams**
- Append-only log data structure
- Perfect for event streaming
- Supports consumer groups (Phase 9)
- Persistent (survives restarts)

### 2. **Event-Driven Architecture**
- API publishes events
- Workers subscribe to events
- Loose coupling between components

### 3. **Async Processing**
- Non-blocking operations
- Better resource utilization
- Improved user experience

---

## 📋 Implementation Steps

### Step 1: Add Redis to Infrastructure
- Add Redis service to docker-compose.yml
- Configure Redis connection
- Test Redis connectivity

### Step 2: Create Queue Service
- Implement Redis Streams publisher
- Create event schema
- Add queue utilities

### Step 3: Modify Payment API
- Keep existing functionality
- Add event publishing after payment creation
- Payment stays PENDING initially

### Step 4: Create Worker Service
- Continuous event consumer
- Payment processing logic
- Status updates (PENDING → PROCESSING → SUCCESS/FAILED)

### Step 5: Test & Verify
- End-to-end flow testing
- Verify status transitions
- Check database updates

---

## 🏗️ New Components

### 1. Redis Configuration (`app/core/redis_client.py`)
```python
# Redis connection management
# Stream operations
# Error handling
```

### 2. Queue Service (`app/services/queue_service.py`)
```python
# Publish events to Redis Streams
# Event serialization
# Queue management
```

### 3. Worker Service (`app/workers/payment_worker.py`)
```python
# Consume events from queue
# Process payments
# Update database
# Error handling
```

### 4. Payment Processor (`app/services/payment_processor.py`)
```python
# Simulate payment processing
# Business logic
# Status transitions
```

---

## 🔄 Payment Flow

### 1. Client Creates Payment
```
POST /payments
{
  "user_id": "user_123",
  "amount": 500
}
```

### 2. API Response (Immediate)
```json
{
  "payment_id": "abc-123",
  "status": "PENDING"
}
```

### 3. Background Processing
```
1. Event published to Redis: {"payment_id": "abc-123", "amount": 500}
2. Worker picks up event
3. Worker updates status to PROCESSING
4. Worker simulates payment processing (2-3 seconds)
5. Worker updates status to SUCCESS or FAILED
```

### 4. Client Checks Status
```
GET /payments/abc-123

Response:
{
  "payment_id": "abc-123",
  "status": "SUCCESS",  // or PROCESSING, or FAILED
  ...
}
```

---

## 📦 Dependencies to Add

```bash
pip install redis
```

---

## 🧪 Testing Strategy

### 1. Unit Tests
- Queue service publish/consume
- Payment processor logic
- Status transitions

### 2. Integration Tests
- API → Queue → Worker → Database
- Multiple concurrent payments
- Worker crash recovery

### 3. Manual Testing
```bash
# Terminal 1: Start API
./scripts/run_app.sh

# Terminal 2: Start Worker
./scripts/run_worker.sh

# Terminal 3: Create payments and check status
curl -X POST http://localhost:8000/payments ...
curl -X GET http://localhost:8000/payments/{id}
```

---

## 🎓 Learning Outcomes

After completing Phase 2, you'll understand:

1. **Why async processing matters**
   - Scalability
   - Responsiveness
   - Fault tolerance

2. **How queues work**
   - Event publishing
   - Event consumption
   - Message persistence

3. **Worker patterns**
   - Background processing
   - Continuous polling
   - Status management

4. **Distributed systems basics**
   - Decoupling components
   - Horizontal scaling
   - Event-driven architecture

---

## 🚀 Success Criteria

✅ Redis running in Docker
✅ API publishes events to queue
✅ Worker consumes events
✅ Payment status transitions work
✅ End-to-end flow verified
✅ Multiple payments processed concurrently

---

## 🔍 Key Files to Create/Modify

### New Files
- `app/core/redis_client.py` - Redis connection
- `app/services/queue_service.py` - Queue operations
- `app/services/payment_processor.py` - Processing logic
- `app/workers/payment_worker.py` - Worker service
- `scripts/run_worker.sh` - Worker startup script

### Modified Files
- `docker-compose.yml` - Add Redis service
- `requirements.txt` - Add redis library
- `app/core/config.py` - Add Redis config
- `app/api/payments.py` - Add event publishing
- `.env` - Add Redis URL

---

## 💡 Important Notes

1. **Payment Status Flow**
   ```
   PENDING (API creates)
      ↓
   PROCESSING (Worker starts)
      ↓
   SUCCESS / FAILED (Worker completes)
   ```

2. **Idempotency** (Phase 6)
   - Not implemented yet
   - Will prevent duplicate processing

3. **Retries** (Phase 4)
   - Not implemented yet
   - Will handle failures

4. **Simulated Processing**
   - We'll use `time.sleep()` to simulate payment gateway calls
   - Random success/failure for testing

---

## 🎯 Next Phase Preview

**Phase 3 (Week 3): Retry Mechanism**
- Handle failures gracefully
- Exponential backoff
- Dead Letter Queue (DLQ)

---

## 📚 Redis Streams Basics

### Publishing Event
```python
redis_client.xadd(
    "payment_queue",
    {"payment_id": "123", "amount": "500"}
)
```

### Consuming Events
```python
while True:
    events = redis_client.xread(
        {"payment_queue": "$"},
        block=1000
    )
    for event in events:
        process_payment(event)
```

---

## 🔧 Troubleshooting

### Redis Connection Issues
```bash
# Check if Redis is running
docker ps | grep redis

# Check Redis logs
docker logs payflow_redis

# Test Redis connection
docker exec -it payflow_redis redis-cli ping
```

### Worker Not Processing
```bash
# Check worker logs
# Verify queue has events
docker exec -it payflow_redis redis-cli XLEN payment_queue

# Check for errors in worker terminal
```

---

Ready to start implementation! 🚀