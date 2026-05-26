#!/bin/bash
# Script to run the FastAPI application

echo "Activating virtual environment..."
source venv/bin/activate

echo ""
echo "Starting FastAPI application..."
echo "API will be available at: http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
echo ""

# Run the application
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Made with Bob
