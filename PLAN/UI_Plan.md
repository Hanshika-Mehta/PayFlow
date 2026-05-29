Instead of showing:

Payment Created
Payment Successful

you'll show:

User
 ↓
Payment API
 ↓
Redis Queue
 ↓
Worker
 ↓
Database
 ↓
Status Update

with live animations.

Final Product Vision

Think of it as:

PayFlow Control Tower

A real-time dashboard showing the entire lifecycle of a payment.

Like Grafana + Stripe Dashboard + System Design Visualization.

Screen 1: Create Payment

Top section:

+----------------------------------+
| Create Payment                   |
+----------------------------------+

Amount:      [1000]
User ID:     [user123]

[ Create Payment ]

When clicked:

Payment ID:
pay_12345
Screen 2: Live Architecture Diagram

This is the coolest part.

 ┌─────────┐
 │ Browser │
 └────┬────┘
      │
      ▼
 ┌─────────┐
 │ API     │
 └────┬────┘
      │
      ▼
 ┌─────────┐
 │ Redis   │
 │ Queue   │
 └────┬────┘
      │
      ▼
 ┌─────────┐
 │ Worker  │
 └────┬────┘
      │
      ▼
 ┌─────────┐
 │ Postgres│
 └─────────┘

Animated packet movement.

Example:

🟢 API RECEIVED REQUEST

⬤────────────▶

Then:

🟡 MESSAGE PUBLISHED TO REDIS

Then:

🟡 WORKER CONSUMING MESSAGE

Then:

🟢 PAYMENT SUCCESSFUL
Screen 3: Payment State Timeline

Like Stripe Dashboard.

Payment Timeline

✓ CREATED

✓ QUEUED

✓ CONSUMED

✓ PROCESSING

✓ SUCCESS

or

✓ CREATED

✓ QUEUED

✓ CONSUMED

✗ FAILED

✓ RETRY 1

✓ RETRY 2

✓ SUCCESS

This helps explain retries.

Screen 4: Redis Queue Visualization

Show exactly what's inside Redis.

Redis Queue

┌───────────────────────┐
│ pay_123               │
│ pay_124               │
│ pay_125               │
└───────────────────────┘

Queue size:

Current Queue Length: 3

Live updates via WebSocket.

Screen 5: Redis Publish Events

Visual event log.

12:01:01
PUBLISH payment.created

12:01:02
PUBLISH payment.processing

12:01:05
PUBLISH payment.success

This teaches pub/sub.

Screen 6: Worker Activity Dashboard

Show worker polling queue.

Worker #1

Status:
Listening

Current Job:
pay_123

Processing Time:
4.2 sec

Animation:

👂 Listening

📦 Received Job

⚙ Processing

✅ Completed
Screen 7: Retry Visualization

This is Amazon-level interesting.

When worker randomly fails:

Payment pay_123

Attempt 1
FAILED

Retry in 1 sec

Then:

Attempt 2
FAILED

Retry in 2 sec

Then:

Attempt 3
SUCCESS

Graphically:

X ---- X ---- ✓
Screen 8: Idempotency Demo

User clicks twice.

Create Payment
Create Payment

Without Idempotency:

Payment Created
Payment Created

With Idempotency:

Payment Created

Duplicate Request Detected

Returning Existing Result

This is extremely valuable for interviews.

Screen 9: Rate Limiting Demo

Press button rapidly.

Request 1 ✓
Request 2 ✓
Request 3 ✓
Request 4 ✓
Request 5 ✓

Request 6 ✗
429 Too Many Requests

Visual counter:

Remaining Requests:
4
3
2
1
0
Screen 10: Cache Demo

Show cache hits.

GET Payment

Cache MISS
DB Query

Response Time:
210 ms

Second call:

GET Payment

Cache HIT
Response Time:
8 ms

Amazon loves this.

Screen 11: System Metrics

Real-time dashboard.

Payments Processed
1,245

Success Rate
98%

Failed
2%

Average Latency
123ms

Queue Depth
15
Screen 12: Load Test Visualization

This is where "high-throughput simulated workloads" becomes real.

Start load test.

Users:
100

RPS:
500

Queue:
25

Workers:
3

Live graph.

TPS
│
│
│     ╱╲
│    ╱  ╲
│___╱____╲_____
Recommended Frontend Stack

Since you already know React:

React
TypeScript

React Flow
Framer Motion
Socket.IO Client

TailwindCSS

Chart.js
React Flow (MOST IMPORTANT)

Use React Flow for architecture diagrams.

It lets you create:

Node
  ↓
Node
  ↓
Node

with animated edges.

Perfect for:

API
 ↓
Redis
 ↓
Worker
 ↓
DB

and animate packets moving.

Backend Changes Needed

Current API:

POST /payments
GET /payments/{id}

Add:

GET /queue/status

GET /worker/status

GET /metrics

GET /events
Best Real-Time Architecture
Frontend
      │
      ▼
WebSocket
      │
      ▼
FastAPI
      │
      ▼
Redis Pub/Sub
      │
      ▼
Worker

Whenever worker changes state:

publish(
  "payment.processing"
)

Frontend instantly updates.

No refresh.

MVP Build Order
Week 1

Build:

Create Payment page
Architecture diagram
Status timeline
Week 2

Add:

Redis Queue viewer
Worker viewer
Event logs
Week 3

Add:

WebSockets
Live animations
Week 4

Add:

Retry simulation
Idempotency demo
Rate limiting demo
Week 5

Add:

Metrics dashboard
Load test dashboard

If built this way, your project won't just be a payment processor simulation. It will become a distributed systems observability platform, where interviewers can literally watch a payment move through API → Redis → Worker → Database in real time. That's an exceptionally strong demonstration project for Amazon Payments.