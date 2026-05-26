# Phase 1 - Week 1 Complete Guide

## 🎯 What We Built

We've successfully completed **Phase 1** of the PayFlow project! Here's what we created:

### 1. **Project Structure**
```
payflow/
├── app/
│   ├── api/          # API endpoints (routes)
│   ├── core/         # Configuration
│   ├── db/           # Database connection
│   ├── models/       # Database models (tables)
│   ├── schemas/      # Request/Response schemas
│   ├── services/     # Business logic
│   └── main.py       # FastAPI application
├── scripts/          # Helper scripts
├── tests/            # Test files (for later)
├── docker-compose.yml
├── requirements.txt
└── .env
```

### 2. **Core Components**

#### **Database Model** (`app/models/payment.py`)
- Defines the `payments` table structure
- Fields: id (UUID), user_id, amount, status, retry_count, timestamps
- Status flow: PENDING → PROCESSING → SUCCESS/FAILED

#### **API Endpoints** (`app/api/payments.py`)
- `POST /payments` - Create a new payment
- `GET /payments/{id}` - Get payment details by ID
- `GET /payments/user/{user_id}` - Get all payments for a user

#### **Service Layer** (`app/services/payment_service.py`)
- Business logic separated from API layer
- Handles database operations
- Makes code more maintainable and testable

---

## 🚀 How to Run

### Step 1: Start Docker Desktop
**IMPORTANT:** You need to start Docker Desktop first!
- Open Docker Desktop application on your Mac
- Wait until it shows "Docker Desktop is running"

### Step 2: Start PostgreSQL Database
```bash
# Option 1: Using docker-compose directly
docker-compose up -d

# Option 2: Using the script
./scripts/start_postgres.sh
```

This will start PostgreSQL with these credentials:
- **Host:** localhost
- **Port:** 5432
- **Database:** payflow_db
- **User:** payflow_user
- **Password:** payflow_pass

### Step 3: Start the FastAPI Application
```bash
# Option 1: Using the script
./scripts/run_app.sh

# Option 2: Manually
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API:** http://localhost:8000
- **Interactive Docs:** http://localhost:8000/docs
- **Alternative Docs:** http://localhost:8000/redoc

---

## 🧪 Testing the APIs

### Using the Interactive Docs (Easiest Way)
1. Open http://localhost:8000/docs in your browser
2. You'll see all available endpoints
3. Click on any endpoint to expand it
4. Click "Try it out" button
5. Fill in the required fields
6. Click "Execute"
    
### Using curl (Command Line)

#### 1. Create a Payment
```bash
curl -X POST "http://localhost:8000/payments" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "amount": 500.00
  }'
```

**Response:**
```json
{
  "payment_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "PENDING"
}
```

#### 2. Get Payment Details
```bash
# Replace {payment_id} with the actual ID from step 1
curl -X GET "http://localhost:8000/payments/{payment_id}"
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "user_123",
  "amount": 500.00,
  "status": "PENDING",
  "retry_count": 0,
  "created_at": "2024-01-01T12:00:00",
  "updated_at": "2024-01-01T12:00:00"
}
```

#### 3. Get All Payments for a User
```bash
curl -X GET "http://localhost:8000/payments/user/user_123"
```

---

## 📚 Key Concepts Learned

### 1. **FastAPI Framework**
- Modern Python web framework
- Automatic API documentation
- Type hints for validation
- Async support (we'll use this in Phase 3)

### 2. **SQLAlchemy ORM**
- Object-Relational Mapping
- Write Python code instead of SQL
- Database-agnostic (can switch databases easily)

### 3. **Pydantic Schemas**
- Data validation
- Request/Response models
- Type safety

### 4. **Layered Architecture**
```
API Layer (routes) 
    ↓
Service Layer (business logic)
    ↓
Database Layer (models)
```

### 5. **Database Design**
- UUID for distributed systems (better than auto-increment IDs)
- Status field for state tracking
- Timestamps for auditing
- Indexes for faster queries

### 6. **Payment Lifecycle**
```
Client Request
    ↓
API receives request
    ↓
Validate data (Pydantic)
    ↓
Service layer processes
    ↓
Save to database
    ↓
Return response
```

---

## 🔍 Verify Everything Works

### Check Database Connection
```bash
# Connect to PostgreSQL
docker exec -it payflow_postgres psql -U payflow_user -d payflow_db

# Inside PostgreSQL, run:
\dt                    # List tables (should see 'payments')
SELECT * FROM payments; # View all payments
\q                     # Exit
```

### Check API Health
```bash
curl http://localhost:8000/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "PayFlow"
}
```

---

## 🛠️ Troubleshooting

### Problem: Docker daemon not running
**Solution:** Start Docker Desktop application

### Problem: Port 5432 already in use
**Solution:** 
```bash
# Stop existing PostgreSQL
docker-compose down

# Or change port in docker-compose.yml
ports:
  - "5433:5432"  # Use 5433 instead
```

### Problem: Module not found errors
**Solution:**
```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Problem: Database connection error
**Solution:**
```bash
# Check if PostgreSQL is running
docker ps

# Check logs
docker-compose logs postgres
```

---

## 📊 What's Next? (Phase 2 - Week 2)

In the next phase, we'll add:
1. **Redis Queue** - Decouple API from processing
2. **Worker Service** - Process payments asynchronously
3. **Async Architecture** - Handle high traffic

This is where the project gets really interesting! We'll learn:
- Why synchronous processing doesn't scale
- How queues enable distributed systems
- How to build fault-tolerant systems

---

## 💡 Important Notes

1. **Database Tables Auto-Created**: When you start the app, SQLAlchemy automatically creates the `payments` table based on our model.

2. **Status is Always PENDING**: Right now, all payments start as PENDING and stay that way. In Phase 3, we'll add workers to actually process them.

3. **No Real Payment Processing**: This is a simulation. We're learning distributed systems concepts, not integrating with real payment gateways.

4. **Development Mode**: The app runs with `--reload` flag, so it automatically restarts when you change code.

---

## 🎓 Interview Questions You Can Now Answer

After completing Phase 1, you can confidently discuss:

1. **What is a REST API?**
   - We built one with FastAPI

2. **What is ORM?**
   - We used SQLAlchemy to interact with PostgreSQL

3. **What is the difference between synchronous and asynchronous processing?**
   - Right now our API is synchronous (we'll make it async in Phase 3)

4. **How do you design a database schema?**
   - We designed the payments table with proper types and indexes

5. **What is layered architecture?**
   - We separated API, Service, and Database layers

6. **Why use UUIDs instead of auto-increment IDs?**
   - Better for distributed systems (no ID conflicts)

---

## 📝 Summary

✅ **Completed:**
- FastAPI application running
- PostgreSQL database connected
- Payment APIs working (Create & Get)
- Clean project structure
- Database models and schemas
- Service layer for business logic

✅ **Skills Gained:**
- FastAPI framework
- SQLAlchemy ORM
- Pydantic validation
- Docker basics
- REST API design
- Database design

🎯 **Ready for Phase 2!**

---

Need help? Check the logs:
```bash
# API logs (in terminal where app is running)
# Database logs
docker-compose logs postgres