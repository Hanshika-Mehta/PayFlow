#!/bin/bash
# Script to start PostgreSQL using Docker

echo "Starting PostgreSQL container..."
docker-compose up -d

echo ""
echo "Waiting for PostgreSQL to be ready..."
sleep 5

echo ""
echo "PostgreSQL is running!"
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: payflow_db"
echo "  User: payflow_user"
echo "  Password: payflow_pass"
echo ""
echo "To stop PostgreSQL, run: docker-compose down"

# Made with Bob
