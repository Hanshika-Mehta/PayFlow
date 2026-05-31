"""
Main FastAPI application.
This is the entry point for the PayFlow payment processing system.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import payments, monitoring, retry_monitoring, advanced_monitoring
from app.db.database import engine, Base
from app.middleware.idempotency import IdempotencyMiddleware
from app.middleware.rate_limiting import RateLimitMiddleware

# Create database tables
# This will create all tables defined in our models
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Distributed Payment Processing Simulation Platform - Week 4: Idempotency + Rate Limiting",
    version="3.0.0",
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc"  # ReDoc UI
)

# Add CORS middleware (for frontend integration later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Rate Limiting middleware (applied first, before idempotency)
# This ensures rate limits are checked before any processing
if settings.RATE_LIMIT_ENABLED:
    app.add_middleware(RateLimitMiddleware)

# Add Idempotency middleware (applied after rate limiting)
# This handles duplicate request detection
if settings.IDEMPOTENCY_ENABLED:
    app.add_middleware(IdempotencyMiddleware)

# Include payment routes
app.include_router(payments.router)

# Include monitoring routes
app.include_router(monitoring.router)

# Include retry and DLQ monitoring routes
app.include_router(retry_monitoring.router)

# Include advanced monitoring routes (Week 4: Idempotency + Rate Limiting)
app.include_router(advanced_monitoring.router)


@app.get("/", tags=["health"])
def root():
    """
    Root endpoint - Health check.
    Returns basic information about the API.
    """
    return {
        "message": "Welcome to PayFlow API",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health", tags=["health"])
def health_check():
    """
    Health check endpoint.
    Used to verify the service is running.
    """
    return {
        "status": "healthy",
        "service": settings.APP_NAME
    }


if __name__ == "__main__":
    import uvicorn
    # Run the application
    # This allows running with: python app/main.py
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG  # Auto-reload on code changes in debug mode
    )

# Made with Bob
