# Week 3 Troubleshooting Guide

## 🚨 Common Issues and Solutions

### Issue 1: Database Schema Error - "column does not exist"

**Error Message:**
```
sqlalchemy.exc.ProgrammingError: (psycopg2.errors.UndefinedColumn) 
column "max_retries" does not exist
```

**Cause:** The new Week 3 columns haven't been added to the database yet.

**Solution:**

**Option A: Using the migration script (Recommended)**

1. Activate your virtual environment:
```bash
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate  # On Windows
```

2. Run the migration script:
```bash
python scripts/apply_week3_migration.py
```

**Option B: Using SQL directly**

1. Connect to your PostgreSQL database:
```bash
psql -U your_username -d payflow
```

2. Run the migration SQL:
```bash
\i scripts/migrate_week3.sql
```

**Option C: Let SQLAlchemy auto-create (Simple but less controlled)**

1. Stop all services
2. Delete the database (⚠️ WARNING: This will delete all data!)
```bash
dropdb payflow
createdb payflow
```
3. Restart the application - SQLAlchemy will create all tables with new schema

---

### Issue 2: Dashboard Showing All Zeros

**Symptoms:**
- Total Payments: 0
- Successful: 0
- Processing: 0
- Failed: 0
- Queue Length: 20 (but no data)

**Cause:** Database migration not applied, so queries are failing silently.

**Solution:**

1. **Apply the database migration** (see Issue 1 above)

2. **Restart all services:**
```bash
# Stop all running services (Ctrl+C in each terminal)

# Terminal 1 - Backend
./scripts/run_app.sh

# Terminal 2 - Worker  
./scripts/run_worker.sh

# Terminal 3 - Frontend
./scripts/run_frontend.sh
```

3. **Create a test payment:**
   - Go to http://localhost:5173
   - Click "Create Payment"
   - Fill in amount and user ID
   - Submit

4. **Verify data is showing:**
   - Dashboard should update with payment count
   - Check Payments page for the new payment
   - Monitor Queue and Worker pages

---

### Issue 3: Retry Stats API Returns 500 Error

**Error in logs:**
```
INFO:     127.0.0.1:60483 - "GET /monitoring/retry-stats HTTP/1.1" 500 Internal Server Error
```

**Cause:** Database columns missing or query failing.

**Solution:**

1. Check backend logs for the actual error:
```bash
# Look for the full traceback in your backend terminal
```

2. Common causes:
   - **Missing columns**: Apply migration (see Issue 1)
   - **Type mismatch**: Ensure all columns have correct types
   - **Null values**: Migration should set defaults

3. Verify columns exist:
```sql
-- Connect to database
psql -U your_username -d payflow

-- Check table structure
\d payments

-- Should show these columns:
-- max_retries | integer | default 3
-- last_error | text
-- error_type | character varying(100)
-- next_retry_at | timestamp
-- moved_to_dlq_at | timestamp
```

---

### Issue 4: Worker Not Processing Retries

**Symptoms:**
- Payments stuck in FAILED status
- `next_retry_at` is in the past but not retrying

**Solution:**

1. **Check worker is running:**
```bash
ps aux | grep payment_worker
```

2. **Check worker logs:**
   - Look for "Processing payment event" messages
   - Check for errors in retry logic

3. **Verify retry logic:**
```python
# In worker, check this condition:
if payment.next_retry_at and payment.next_retry_at > datetime.utcnow():
    # Should skip if retry time hasn't arrived yet
    return
```

4. **Restart worker:**
```bash
# Stop worker (Ctrl+C)
./scripts/run_worker.sh
```

---

### Issue 5: DLQ Page Shows No Data

**Symptoms:**
- DLQ Monitor page loads but shows "No messages in DLQ"
- Even though payments have failed 3+ times

**Solution:**

1. **Check if payments reached max retries:**
```sql
SELECT id, status, retry_count, max_retries, moved_to_dlq_at 
FROM payments 
WHERE retry_count >= max_retries;
```

2. **Verify DLQ stream exists in Redis:**
```bash
redis-cli
> XLEN payment_dlq
> XRANGE payment_dlq - + COUNT 10
```

3. **Check worker is moving payments to DLQ:**
   - Look for log message: "Payment {id} exceeded max retries"
   - Check for "Moving to DLQ" messages

4. **Manually test DLQ:**
```python
# In Python shell
from app.services.dlq_service import dlq_service
from uuid import uuid4

# Add test message
dlq_service.move_to_dlq(
    payment_id=uuid4(),
    user_id="test_user",
    amount=100.0,
    error_message="Test error",
    error_type="TEST_ERROR",
    retry_count=3
)

# Check it was added
stats = dlq_service.get_dlq_stats()
print(stats)
```

---

### Issue 6: Frontend Not Updating

**Symptoms:**
- UI shows old data
- Changes in backend not reflected

**Solution:**

1. **Hard refresh browser:**
   - Chrome/Firefox: Ctrl+Shift+R (Cmd+Shift+R on Mac)
   - Or clear cache and reload

2. **Check API endpoints:**
```bash
# Test retry stats endpoint
curl http://localhost:8000/monitoring/retry-stats

# Test DLQ endpoint
curl http://localhost:8000/monitoring/dlq/stats
```

3. **Check browser console:**
   - Open DevTools (F12)
   - Look for API errors in Console tab
   - Check Network tab for failed requests

4. **Restart frontend:**
```bash
# Stop frontend (Ctrl+C)
cd frontend
npm run dev
```

---

### Issue 7: Type Errors in IDE

**Symptoms:**
- Red squiggly lines in VSCode
- Type errors like "Cannot assign to attribute"

**Cause:** These are SQLAlchemy type checking issues - they're warnings, not runtime errors.

**Solution:**

These errors are **cosmetic only** and don't affect functionality. The code works correctly at runtime.

To suppress them (optional):
1. Add `# type: ignore` comments
2. Or configure your IDE to ignore SQLAlchemy type issues

---

## 🔍 Debugging Checklist

When something isn't working, check these in order:

- [ ] Database migration applied successfully
- [ ] All services restarted after migration
- [ ] Backend API is running (http://localhost:8000/docs)
- [ ] Worker is running and processing events
- [ ] Redis is running (check with `redis-cli ping`)
- [ ] PostgreSQL is running (check with `psql -l`)
- [ ] Frontend is running (http://localhost:5173)
- [ ] Browser cache cleared
- [ ] Check backend logs for errors
- [ ] Check worker logs for errors
- [ ] Check browser console for errors

---

## 📊 Verification Steps

After fixing issues, verify everything works:

### 1. Test Payment Creation
```bash
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test_user", "amount": 100.50}'
```

### 2. Check Dashboard
- Go to http://localhost:5173
- Should show payment count > 0
- All stats should have values

### 3. Test Retry Flow
1. Create multiple payments
2. Some will fail (30% chance)
3. Check Retry Monitor page
4. Should see failed payments with countdown

### 4. Test DLQ
1. Wait for a payment to fail 3 times
2. Check DLQ Monitor page
3. Should see payment in DLQ
4. Click "Retry" button
5. Payment should move back to queue

### 5. Check API Endpoints
```bash
# Retry stats
curl http://localhost:8000/monitoring/retry-stats | jq

# DLQ stats
curl http://localhost:8000/monitoring/dlq/stats | jq

# Queue info
curl http://localhost:8000/monitoring/queue | jq
```

---

## 🆘 Still Having Issues?

If you're still experiencing problems:

1. **Check the logs carefully** - The error message usually tells you exactly what's wrong

2. **Verify environment variables** - Check your `.env` file has all required values

3. **Test each component separately:**
   - Can you connect to PostgreSQL?
   - Can you connect to Redis?
   - Does the API start without errors?
   - Does the worker start without errors?

4. **Start fresh** (last resort):
```bash
# Stop all services
# Drop and recreate database
dropdb payflow
createdb payflow

# Clear Redis
redis-cli FLUSHALL

# Restart everything
./scripts/run_app.sh  # Terminal 1
./scripts/run_worker.sh  # Terminal 2
./scripts/run_frontend.sh  # Terminal 3
```

---

## 📞 Quick Reference

### Service URLs
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:5173
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Important Files
- **Backend Config**: `app/core/config.py`
- **Environment**: `.env`
- **Migration**: `scripts/migrate_week3.sql`
- **Worker**: `app/workers/payment_worker.py`

### Useful Commands
```bash
# Check PostgreSQL
psql -U your_user -d payflow -c "SELECT COUNT(*) FROM payments;"

# Check Redis
redis-cli XLEN payment_queue
redis-cli XLEN payment_dlq

# Check processes
ps aux | grep uvicorn
ps aux | grep payment_worker
ps aux | grep node

# View logs
tail -f /path/to/backend.log
tail -f /path/to/worker.log
```

---

**Made with ❤️ by Bob**