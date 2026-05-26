"""
Database connection and session management.
This file sets up SQLAlchemy engine and session factory.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Create database engine
# echo=True will log all SQL statements (useful for debugging)
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True  # Verify connections before using them
)

# Create session factory
# autocommit=False: We'll manually commit transactions
# autoflush=False: We'll manually flush changes
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all database models
Base = declarative_base()


def get_db():
    """
    Dependency function to get database session.
    This will be used in FastAPI endpoints to inject database sessions.
    
    Usage in endpoint:
        def my_endpoint(db: Session = Depends(get_db)):
            # use db here
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Made with Bob
