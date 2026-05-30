"""
Payment database model.
Defines the structure of the payments table in PostgreSQL.
"""
from sqlalchemy import Column, String, Numeric, DateTime, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.db.database import Base


class Payment(Base):
    """
    Payment model representing a payment transaction.
    
    Status Flow:
        PENDING -> PROCESSING -> SUCCESS/FAILED -> (retry) -> DLQ
    
    Retry Flow:
        - Failed payments are retried with exponential backoff
        - After max retries, moved to Dead Letter Queue (DLQ)
    """
    __tablename__ = "payments"
    
    # Primary key - UUID for distributed systems
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # User who initiated the payment
    user_id = Column(String, nullable=False, index=True)
    
    # Payment amount (using Numeric for precise decimal handling)
    amount = Column(Numeric(10, 2), nullable=False)
    
    # Payment status: PENDING, PROCESSING, SUCCESS, FAILED, DLQ
    status = Column(String, nullable=False, default="PENDING", index=True)
    
    # Retry tracking
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Error tracking
    last_error = Column(Text, nullable=True)
    error_type = Column(String, nullable=True)
    
    # Retry scheduling
    next_retry_at = Column(DateTime, nullable=True)
    
    # DLQ tracking
    moved_to_dlq_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<Payment(id={self.id}, user_id={self.user_id}, amount={self.amount}, status={self.status})>"

# Made with Bob
