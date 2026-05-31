#!/bin/bash

# PayFlow Load Testing Runner
# Automates the complete testing workflow with detailed reporting

set -e

echo "=================================="
echo "PayFlow Load Testing Suite"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if services are running
check_service() {
    local service=$1
    local url=$2
    
    echo -n "Checking $service... "
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Not running${NC}"
        return 1
    fi
}

# Detect Python command
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo -e "${RED}Error: Python not found!${NC}"
    echo "Please install Python 3"
    exit 1
fi

echo "Using Python: $PYTHON_CMD"

# Install dependencies
echo "📦 Installing dependencies..."
$PYTHON_CMD -m pip install -q -r requirements.txt
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Function to generate detailed report
generate_report() {
    local test_results_file=$1
    echo ""
    echo "📊 Generating detailed component analysis report..."
    $PYTHON_CMD report_generator.py "$test_results_file"
    echo -e "${GREEN}✓ Report generated${NC}"
}

# Check services
echo "🔍 Checking services..."
API_RUNNING=false
if check_service "FastAPI" "http://localhost:8000/docs"; then
    API_RUNNING=true
fi

if ! $API_RUNNING; then
    echo -e "${RED}Error: FastAPI is not running!${NC}"
    echo "Please start the API server first:"
    echo "  python -m uvicorn app.main:app --reload"
    exit 1
fi

echo ""

# Menu
echo "Select test to run:"
echo "  1) Simple Load Test (1,000 payments, ~30s)"
echo "  2) Bulk Load Test (10,000+ payments, ~5min)"
echo "  3) Queue Monitor (continuous monitoring)"
echo "  4) Full Test Suite (Simple + Bulk + Monitor)"
echo "  5) Exit"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo ""
        echo "🚀 Running Simple Load Test..."
        echo "=================================="
        $PYTHON_CMD simple_load_test.py
        
        echo ""
        echo "Waiting 5 seconds for metrics to stabilize..."
        sleep 5
        generate_report
        ;;
    2)
        echo ""
        echo "🚀 Running Bulk Load Test..."
        echo "=================================="
        $PYTHON_CMD bulk_load_test.py
        
        # Find the most recent test results file
        LATEST_RESULTS=$(ls -t load_test_results_*.json 2>/dev/null | head -1)
        
        echo ""
        echo "Waiting 10 seconds for metrics to stabilize..."
        sleep 10
        
        if [ -n "$LATEST_RESULTS" ]; then
            generate_report "$LATEST_RESULTS"
        else
            generate_report
        fi
        ;;
    3)
        echo ""
        echo "🚀 Running End-to-End Test..."
        echo "=================================="
        $PYTHON_CMD end_to_end_test.py
        
        # Find the most recent test results file
        LATEST_RESULTS=$(ls -t e2e_test_results_*.json 2>/dev/null | head -1)
        
        if [ -n "$LATEST_RESULTS" ]; then
            generate_report "$LATEST_RESULTS"
        else
            generate_report
        fi
        ;;
    5)
        echo ""
        echo "🔍 Starting Queue Monitor..."
        echo "=================================="
        echo "Press Ctrl+C to stop"
        $PYTHON_CMD queue_monitor.py
        ;;
    4)
        echo ""
        echo "🚀 Running Full Test Suite..."
        echo "=================================="
        
        # Start monitor in background
        echo "Starting queue monitor..."
        $PYTHON_CMD queue_monitor.py 5 600 > monitor_output.log 2>&1 &
        MONITOR_PID=$!
        
        sleep 2
        
        # Run simple test
        echo ""
        echo "Running simple load test..."
        $PYTHON_CMD simple_load_test.py
        
        sleep 5
        
        # Run bulk test
        echo ""
        echo "Running bulk load test..."
        $PYTHON_CMD bulk_load_test.py
        
        # Wait a bit for processing
        echo ""
        echo "Waiting 30s for worker processing..."
        sleep 30
        
        # Stop monitor
        echo "Stopping monitor..."
        kill $MONITOR_PID 2>/dev/null || true
        
        # Find the most recent test results file
        LATEST_RESULTS=$(ls -t load_test_results_*.json 2>/dev/null | head -1)
        
        echo ""
        echo "Generating comprehensive report..."
        if [ -n "$LATEST_RESULTS" ]; then
            generate_report "$LATEST_RESULTS"
        else
            generate_report
        fi
        
        echo ""
        echo -e "${GREEN}✓ Full test suite completed!${NC}"
        echo "Monitor logs saved to: monitor_output.log"
        echo ""
        echo "📊 Reports generated:"
        echo "   - HTML Report: load_test_report_*.html"
        echo "   - JSON Results: $LATEST_RESULTS"
        echo "   - Monitor Logs: monitor_output.log"
        ;;
    6)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "=================================="
echo -e "${GREEN}✓ Testing complete!${NC}"
echo "=================================="

# Made with Bob
