#!/bin/bash

# Test script for idempotency
# This will help diagnose the issue

echo "=== Testing Idempotency ==="
echo ""

# Generate a unique key for this test
TEST_KEY="test-$(date +%s)"

echo "Using idempotency key: $TEST_KEY"
echo ""

echo "=== Request 1 (First time) ==="
RESPONSE1=$(curl -s -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $TEST_KEY" \
  -d '{"user_id": "user_test", "amount": 999}' \
  -w "\nHTTP_CODE:%{http_code}\n")

echo "$RESPONSE1"
PAYMENT_ID1=$(echo "$RESPONSE1" | grep -o '"payment_id":"[^"]*"' | cut -d'"' -f4)
echo ""
echo "Payment ID from Request 1: $PAYMENT_ID1"
echo ""

# Wait a moment
sleep 2

echo "=== Request 2 (Duplicate - should return same ID) ==="
RESPONSE2=$(curl -s -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $TEST_KEY" \
  -d '{"user_id": "user_test", "amount": 999}' \
  -w "\nHTTP_CODE:%{http_code}\n" \
  -v 2>&1)

echo "$RESPONSE2"
PAYMENT_ID2=$(echo "$RESPONSE2" | grep -o '"payment_id":"[^"]*"' | cut -d'"' -f4)
echo ""
echo "Payment ID from Request 2: $PAYMENT_ID2"
echo ""

# Check for replay header
REPLAY_HEADER=$(echo "$RESPONSE2" | grep -i "X-Idempotency-Replay")
echo "Replay Header: $REPLAY_HEADER"
echo ""

# Compare
echo "=== Result ==="
if [ "$PAYMENT_ID1" == "$PAYMENT_ID2" ]; then
    echo "✅ SUCCESS: Both requests returned the same payment ID!"
    echo "   Payment ID: $PAYMENT_ID1"
else
    echo "❌ FAILED: Different payment IDs returned!"
    echo "   Request 1: $PAYMENT_ID1"
    echo "   Request 2: $PAYMENT_ID2"
fi
echo ""

# Check Redis
echo "=== Checking Redis ==="
echo "Cached keys:"
redis-cli KEYS "idem:*" 2>/dev/null || echo "Redis CLI not available"
echo ""
echo "Cached response for $TEST_KEY:"
redis-cli GET "idem:response:$TEST_KEY" 2>/dev/null || echo "Redis CLI not available"
echo ""

echo "=== Test Complete ==="

# Made with Bob
