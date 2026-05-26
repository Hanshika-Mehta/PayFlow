"""
Payment database model.
Defines the structure of the payments table in PostgreSQL.
"""
from sqlalchemy import Column, String, Numeric, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.db.database import Base


class Payment(Base):
    """
    Payment model representing a payment transaction.
    
    Status Flow:
        PENDING -> PROCESSING -> SUCCESS/FAILED
    """
    __tablename__ = "payments"
    
    # Primary key - UUID for distributed systems
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # User who initiated the payment
    user_id = Column(String, nullable=False, index=True)
    
    # Payment amount (using Numeric for precise decimal handling)
    amount = Column(Numeric(10, 2), nullable=False)
    
    # Payment status: PENDING, PROCESSING, SUCCESS, FAILED
    status = Column(String, nullable=False, default="PENDING", index=True)
    
    # Retry tracking (will be used in Phase 4)
    retry_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<Payment(id={self.id}, user_id={self.user_id}, amount={self.amount}, status={self.status})>"

# Made with Bob
