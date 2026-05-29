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
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create a global settings instance
settings = Settings()

# Made with Bob
