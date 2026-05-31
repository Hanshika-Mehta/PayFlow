IF T# Retry Mechanism Fix

## Problem Identified

The retry mechanism was not working as expected. Failed transactions were showing up in the UI's "Retry Monitor" page but were never actually being retried, and consequently never moving to the Dead Letter Queue (DLQ) after max retries.

### Root Cause Analysis

**Issue 1: Worker Only Reads NEW Messages**
```python
# OLD CODE in payment_worker.py
events = self.redis.xreadgroup(
    self.CONSUMER_GROUP,
    self.CONSUMER_NAME,
    {self.QUEUE_NAME: '>'},  # ← '>' means only NEW messages
    count=10,
    block=1000
)
```

**Issue 2: Pending Events Never Re-Processed**
When a payment failed and needed retry:
1. Worker skipped the event (didn't acknowledge it)
2. Event stayed in "pending" state in Redis
3. Worker only read NEW events with `>`
4. **Pending retry events were NEVER picked up again!**

**Issue 3: No Mechanism to Check Pending Events**
The worker had no logic to:
- Check for pending events that are ready for retry
- Re-process them when `next_retry_at` time has passed
- Only then read new events

## Solution Implemented

### Changes to [`app/workers/payment_worker.py`](app/workers/payment_worker.py)

**1. Added `_process_pending_events()` Method**
```python
def _process_pending_events(self):
    """
    Process pending events that are ready for retry.
    
    Checks for events that were not acknowledged (pending) and processes
    them if their retry time has arrived.
    """
    try:
        # Get pending events for this consumer
        # XPENDING shows events that were read but not acknowledged
        pending_info = self.redis.xpending_range(
            self.QUEUE_NAME,
            self.CONSUMER_GROUP,
            min='-',
            max='+',
            count=10,
            consumername=self.CONSUMER_NAME
        )
        
        if pending_info:
            logger.debug(f"Found {len(pending_info)} pending events to check")
            
            for pending in pending_info:
                event_id = pending['message_id']
                
                # Claim the event to process it
                # XCLAIM transfers ownership of pending messages
                claimed = self.redis.xclaim(
                    self.QUEUE_NAME,
                    self.CONSUMER_GROUP,
                    self.CONSUMER_NAME,
                    min_idle_time=0,  # Claim immediately
                    message_ids=[event_id]
                )
                
                if claimed:
                    for claimed_id, event_data in claimed:
                        self.process_event(claimed_id, event_data)
                        
    except Exception as e:
        logger.error(f"Error processing pending events: {e}")
```

**2. Updated `start()` Method**
```python
def start(self):
    """
    Start the worker to continuously process events.
    
    This runs an infinite loop that:
    1. First checks for pending events ready for retry
    2. Then reads new events from Redis Stream
    3. Processes each event
    4. Waits for new events if queue is empty
    """
    self.running = True
    logger.info(f"Payment worker started. Listening to queue: {self.QUEUE_NAME}")
    
    while self.running:
        try:
            # STEP 1: Process pending events that might be ready for retry
            self._process_pending_events()
            
            # STEP 2: Read new events from the stream
            events = self.redis.xreadgroup(
                self.CONSUMER_GROUP,
                self.CONSUMER_NAME,
                {self.QUEUE_NAME: '>'},  # > means read new messages
                count=10,
                block=1000  # Block for 1 second
            )
            
            if events:
                for stream_name, stream_events in events:
                    for event_id, event_data in stream_events:
                        self.process_event(event_id, event_data)
            else:
                logger.debug("No new events in queue, waiting...")
```

## How It Works Now

### Retry Flow
1. **Payment Fails**: Payment processor marks payment as FAILED and sets `next_retry_at`
2. **Event Stays Pending**: Worker doesn't acknowledge the event, it stays in Redis pending list
3. **Worker Checks Pending**: On each loop iteration, worker checks pending events
4. **Claims Ready Events**: If `next_retry_at` has passed, worker claims and re-processes the event
5. **Exponential Backoff**: Each retry waits longer (1s, 2s, 4s, 8s, 16s)
6. **Max Retries**: After 3 failed attempts, payment moves to DLQ

### Configuration
From [`app/core/config.py`](app/core/config.py:23-25):
```python
MAX_RETRIES: int = 3
RETRY_BASE_DELAY: int = 1  # Base delay in seconds
RETRY_MAX_DELAY: int = 60  # Maximum delay in seconds
```

### Exponential Backoff Formula
```python
delay = min(base_delay * (2 ^ retry_count), max_delay)
```

**Retry Schedule:**
- Attempt 1: Immediate
- Attempt 2: After 1 second (2^0)
- Attempt 3: After 2 seconds (2^1)
- Attempt 4: After 4 seconds (2^2)
- After 3 failures → Move to DLQ

## Testing the Fix

### 1. Restart the Worker
```bash
# Stop the old worker
ps aux | grep payment_worker
kill <PID>

# Start the new worker with the fix
python -m app.workers.payment_worker
```

### 2. Monitor the Retry Process
1. Open http://localhost:5173/retries
2. Create a new payment (30% will fail due to simulation)
3. Watch the "Recent Failures" section:
   - **Attempt count should increment**: 0/3 → 1/3 → 2/3 → 3/3
   - **Countdown timer should appear**: Shows seconds until next retry
   - **Status should change**: Ready → Processing → Failed (with countdown)
4. After 3 failed attempts, payment should move to DLQ

### 3. Verify DLQ Movement
1. Open http://localhost:5173/dlq
2. Failed payments (after 3 retries) should appear here
3. Check the "Total Messages" count increases

### 4. Check Worker Logs
```bash
# Watch worker logs for retry activity
tail -f <worker_log_file>

# Look for messages like:
# "Found X pending events to check"
# "Payment {id} will be retried in Xs (attempt X/3)"
# "Payment {id} exceeded max retries. Moving to DLQ."
```

## Expected Behavior

### Before Fix
- ❌ Payments stuck at "0 / 3 ATTEMPT"
- ❌ Status always "Ready" but never retried
- ❌ Never moved to DLQ
- ❌ Retry count never incremented

### After Fix
- ✅ Retry count increments: 0 → 1 → 2 → 3
- ✅ Countdown timer shows time until next retry
- ✅ Exponential backoff delays are respected
- ✅ After 3 failures, payment moves to DLQ
- ✅ DLQ monitor shows failed payments

## Key Redis Operations

### XPENDING_RANGE
Gets list of pending (unacknowledged) messages for a consumer:
```python
pending_info = redis.xpending_range(
    stream_name,
    consumer_group,
    min='-',
    max='+',
    count=10,
    consumername=consumer_name
)
```

### XCLAIM
Claims ownership of pending messages to re-process them:
```python
claimed = redis.xclaim(
    stream_name,
    consumer_group,
    consumer_name,
    min_idle_time=0,
    message_ids=[event_id]
)
```

### XACK
Acknowledges a message (removes from pending):
```python
redis.xack(stream_name, consumer_group, event_id)
```

## Architecture Benefits

1. **Fault Tolerance**: Events aren't lost if worker crashes
2. **Distributed Processing**: Multiple workers can process events
3. **Automatic Retry**: Failed events are automatically retried
4. **Exponential Backoff**: Prevents overwhelming downstream services
5. **DLQ Pattern**: Permanently failed events are isolated for manual review

## Related Files

- [`app/workers/payment_worker.py`](app/workers/payment_worker.py) - Worker implementation
- [`app/services/payment_processor.py`](app/services/payment_processor.py) - Payment processing logic
- [`app/services/dlq_service.py`](app/services/dlq_service.py) - DLQ management
- [`app/api/retry_monitoring.py`](app/api/retry_monitoring.py) - Retry stats API
- [`frontend/src/pages/RetryMonitor.tsx`](frontend/src/pages/RetryMonitor.tsx) - UI component

## Summary

The fix ensures that failed payments are properly retried with exponential backoff and eventually moved to the DLQ after max retries. The worker now actively checks for pending events that are ready for retry, rather than only processing new events.