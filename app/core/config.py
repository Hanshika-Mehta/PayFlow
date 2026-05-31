"""
Application configuration settings.
Loads environment variables and provides configuration for the app.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "PayFlow"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str
    
    # Retry Configuration
    MAX_RETRIES: int = 3
    RETRY_BASE_DELAY: int = 1  # Base delay in seconds for exponential backoff
    RETRY_MAX_DELAY: int = 60  # Maximum delay in seconds
    
    # Failure Simulation
    FAILURE_RATE: float = 0.3  # 30% failure rate for testing
    ENABLE_FAILURE_SIMULATION: bool = True
    
    # DLQ Configuration
    DLQ_STREAM_NAME: str = "payment_dlq"
    DLQ_MAX_LENGTH: int = 10000
    
    # Idempotency Configuration
    IDEMPOTENCY_ENABLED: bool = True
    IDEMPOTENCY_KEY_TTL: int = 86400  # 24 hours in seconds
    IDEMPOTENCY_KEY_HEADER: str = "Idempotency-Key"
    
    # Rate Limiting Configuration
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_USER: int = 100  # requests per minute per user
    RATE_LIMIT_PER_IP: int = 400  # requests per minute per IP
    RATE_LIMIT_WINDOW: int = 60  # window in seconds
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create a global settings instance
settings = Settings()

# Made with Bob
