"""
Payment service containing business logic for payment operations.
This layer sits between the API and the database.
"""
from sqlalchemy.orm import Session
from uuid import UUID
from app.models.payment import Payment
from app.schemas.payment import PaymentCreate
from typing import Optional


class PaymentService:
    """Service class for payment-related operations."""
    
    @staticmethod
    def create_payment(db: Session, payment_data: PaymentCreate) -> Payment:
        """
        Create a new payment in the database.
        
        Args:
            db: Database session
            payment_data: Payment creation data from request
            
        Returns:
            Created Payment object
        """
        # Create new payment instance
        new_payment = Payment(
            user_id=payment_data.user_id,
            amount=payment_data.amount,
            status="PENDING"  # All payments start as PENDING
        )
        
        # Add to database session
        db.add(new_payment)
        
        # Commit transaction to save to database
        db.commit()
        
        # Refresh to get the generated ID and timestamps
        db.refresh(new_payment)
        
        return new_payment
    
    @staticmethod
    def get_payment_by_id(db: Session, payment_id: UUID) -> Optional[Payment]:
        """
        Retrieve a payment by its ID.
        
        Args:
            db: Database session
            payment_id: UUID of the payment
            
        Returns:
            Payment object if found, None otherwise
        """
        return db.query(Payment).filter(Payment.id == payment_id).first()
    
    @staticmethod
    def get_payments_by_user(db: Session, user_id: str, skip: int = 0, limit: int = 100) -> list[Payment]:
        """
        Get all payments for a specific user.
        
        Args:
            db: Database session
            user_id: User ID
            skip: Number of records to skip (for pagination)
            limit: Maximum number of records to return
            
        Returns:
            List of Payment objects
        """
        return db.query(Payment).filter(Payment.user_id == user_id).offset(skip).limit(limit).all()

# Made with Bob
