"""
Payment processor service.
Simulates payment processing with external payment gateway.
"""
import time
import random
import logging
from sqlalchemy.orm import Session
from uuid import UUID
from app.models.payment import Payment

logger = logging.getLogger(__name__)


class PaymentProcessor:
    """
    Service to process payments.
    Simulates interaction with external payment gateway.
    """
    
    @staticmethod
    def process_payment(db: Session, payment_id: UUID) -> bool:
        """
        Process a payment.
        
        This simulates calling an external payment gateway API.
        In a real system, this would:
        - Call Stripe/PayPal/etc API
        - Handle authentication
        - Process the transaction
        - Handle webhooks
        
        Args:
            db: Database session
            payment_id: UUID of the payment to process
            
        Returns:
            True if payment succeeded, False if failed
        """
        # Fetch payment from database
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        
        if not payment:
            logger.error(f"Payment {payment_id} not found")
            return False
        
        # Update status to PROCESSING
        payment.status = "PROCESSING"
        db.commit()
        logger.info(f"Payment {payment_id} status updated to PROCESSING")
        
        # Simulate payment gateway call (2-3 seconds)
        processing_time = random.uniform(2.0, 3.0)
        logger.info(f"Processing payment {payment_id} (simulated delay: {processing_time:.2f}s)")
        time.sleep(processing_time)
        
        # Simulate success/failure (80% success rate)
        success = random.random() < 0.8
        
        if success:
            payment.status = "SUCCESS"
            logger.info(f"Payment {payment_id} processed successfully")
        else:
            payment.status = "FAILED"
            logger.warning(f"Payment {payment_id} failed")
        
        # Save final status
        db.commit()
        db.refresh(payment)
        
        return success
    
    @staticmethod
    def update_payment_status(
        db: Session,
        payment_id: UUID,
        status: str
    ) -> bool:
        """
        Update payment status.
        
        Args:
            db: Database session
            payment_id: UUID of the payment
            status: New status (PENDING, PROCESSING, SUCCESS, FAILED)
            
        Returns:
            True if updated successfully, False otherwise
        """
        try:
            payment = db.query(Payment).filter(Payment.id == payment_id).first()
            
            if not payment:
                logger.error(f"Payment {payment_id} not found")
                return False
            
            old_status = payment.status
            payment.status = status
            db.commit()
            
            logger.info(
                f"Payment {payment_id} status updated: {old_status} -> {status}"
            )
            return True
            
        except Exception as e:
            logger.error(f"Failed to update payment status: {e}")
            db.rollback()
            return False

# Made with Bob
