#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Idempotency System Status Check                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check Redis
echo "1️⃣  Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is running${NC}"
else
    echo -e "${RED}❌ Redis is NOT running${NC}"
    echo "   Start Redis: docker run -p 6379:6379 redis"
fi
echo ""

# 2. Check Backend
echo "2️⃣  Checking Backend..."
if ps aux | grep -q "[u]vicorn app.main:app"; then
    echo -e "${GREEN}✅ Backend is running${NC}"
    ps aux | grep "[u]vicorn app.main:app" | awk '{print "   PID: " $2}'
else
    echo -e "${RED}❌ Backend is NOT running${NC}"
    echo "   Start backend: ./scripts/run_app.sh"
fi
echo ""

# 3. Check Configuration
echo "3️⃣  Checking Configuration..."
if [ -f .env ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    
    # Check Redis URL
    if grep -q "REDIS_URL" .env; then
        REDIS_URL=$(grep "REDIS_URL" .env | cut -d'=' -f2)
        echo "   Redis URL: $REDIS_URL"
    else
        echo -e "${YELLOW}⚠️  REDIS_URL not found in .env${NC}"
    fi
    
    # Check Idempotency Enabled
    if grep -q "IDEMPOTENCY_ENABLED" .env; then
        IDEM_ENABLED=$(grep "IDEMPOTENCY_ENABLED" .env | cut -d'=' -f2)
        if [ "$IDEM_ENABLED" = "true" ] || [ "$IDEM_ENABLED" = "True" ]; then
            echo -e "${GREEN}   Idempotency: Enabled${NC}"
        else
            echo -e "${RED}   Idempotency: Disabled${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  IDEMPOTENCY_ENABLED not found in .env${NC}"
    fi
else
    echo -e "${RED}❌ .env file not found${NC}"
fi
echo ""

# 4. Check Redis Keys
echo "4️⃣  Checking Redis Keys..."
KEY_COUNT=$(redis-cli KEYS "idem:*" 2>/dev/null | wc -l)
if [ $KEY_COUNT -gt 0 ]; then
    echo -e "${GREEN}✅ Found $KEY_COUNT idempotency keys${NC}"
    echo "   Keys:"
    redis-cli KEYS "idem:*" 2>/dev/null | head -5 | sed 's/^/   - /'
    if [ $KEY_COUNT -gt 5 ]; then
        echo "   ... and $((KEY_COUNT - 5)) more"
    fi
else
    echo -e "${YELLOW}⚠️  No idempotency keys found in Redis${NC}"
    echo "   This is normal if no requests have been made yet"
fi
echo ""

# 5. Check Logs
echo "5️⃣  Checking Recent Logs..."
if [ -f logs/api.log ]; then
    echo -e "${GREEN}✅ Log file exists${NC}"
    
    # Check for idempotency logs
    IDEM_LOG_COUNT=$(grep -i "idempotency" logs/api.log 2>/dev/null | wc -l)
    if [ $IDEM_LOG_COUNT -gt 0 ]; then
        echo "   Found $IDEM_LOG_COUNT idempotency-related log entries"
        echo "   Recent entries:"
        grep -i "idempotency" logs/api.log 2>/dev/null | tail -3 | sed 's/^/   /'
    else
        echo -e "${YELLOW}⚠️  No idempotency logs found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Log file not found: logs/api.log${NC}"
fi
echo ""

# 6. Test Endpoint
echo "6️⃣  Testing Payment Endpoint..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null | grep -q "200"; then
    echo -e "${GREEN}✅ Backend is responding${NC}"
else
    echo -e "${RED}❌ Backend is not responding${NC}"
    echo "   Make sure backend is running on port 8000"
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Summary                                                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next Steps:"
echo "1. If Redis or Backend is not running, start them"
echo "2. Run the test: ./test_idempotency.sh"
echo "3. Check the troubleshooting guide: IDEMPOTENCY_TROUBLESHOOTING_STEPS.md"
echo ""

# Made with Bob
