#!/bin/bash
# Script to run the payment worker service

echo "Activating virtual environment..."
source venv/bin/activate

echo ""
echo "Starting Payment Worker..."
echo "Worker will process payments from the queue"
echo "Press Ctrl+C to stop"
echo ""

# Run the worker
python -m app.workers.payment_worker

# Made with Bob
