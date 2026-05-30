"""
Payment processor service.
Simulates payment processing with external payment gateway.
Includes retry mechanism with exponential backoff and failure simulation.
"""
import time
import random
import logging
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timedelta
from typing import Tuple, Optional
from app.models.payment import Payment
from app.core.config import settings

logger = logging.getLogger(__name__)


class PaymentError(Exception):
    """Base exception for payment processing errors."""
    pass


class GatewayTimeoutError(PaymentError):
    """Gateway timeout error."""
    pass


class NetworkError(PaymentError):
    """Network connectivity error."""
    pass


class InsufficientFundsError(PaymentError):
    """Insufficient funds error."""
    pass


class InvalidPaymentMethodError(PaymentError):
    """Invalid payment method error."""
    pass


class PaymentProcessor:
    """
    Service to process payments with retry mechanism.
    Simulates interaction with external payment gateway.
    """
    
    # Error types for simulation
    ERROR_TYPES = [
        (GatewayTimeoutError, "GATEWAY_TIMEOUT", "Payment gateway timeout"),
        (NetworkError, "NETWORK_ERROR", "Network connection failed"),
        (InsufficientFundsError, "INSUFFICIENT_FUNDS", "Insufficient funds"),
        (InvalidPaymentMethodError, "INVALID_PAYMENT_METHOD", "Invalid payment method"),
    ]
    
    @staticmethod
    def _simulate_failure() -> Optional[Tuple[Exception, str, str]]:
        """
        Simulate random payment failures for testing.
        
        Returns:
            Tuple of (Exception, error_type, error_message) or None if success
        """
        if not settings.ENABLE_FAILURE_SIMULATION:
            return None
        
        # Simulate failure based on configured rate
        if random.random() < settings.FAILURE_RATE:
            error_class, error_type, error_message = random.choice(PaymentProcessor.ERROR_TYPES)
            return (error_class(error_message), error_type, error_message)
        
        return None
    
    @staticmethod
    def calculate_retry_delay(retry_count: int) -> int:
        """
        Calculate exponential backoff delay for retries.
        
        Formula: delay = min(base_delay * (2 ^ retry_count), max_delay)
        
        Args:
            retry_count: Current retry attempt number
            
        Returns:
            Delay in seconds
        """
        delay = settings.RETRY_BASE_DELAY * (2 ** retry_count)
        return min(delay, settings.RETRY_MAX_DELAY)
    
    @staticmethod
    def process_payment(db: Session, payment_id: UUID) -> bool:
        """
        Process a payment with error handling and retry tracking.
        
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
        logger.info(
            f"Payment {payment_id} status updated to PROCESSING "
            f"(attempt {payment.retry_count + 1}/{payment.max_retries})"
        )
        
        try:
            # Simulate payment gateway call (1-2 seconds)
            processing_time = random.uniform(1.0, 2.0)
            logger.info(f"Processing payment {payment_id} (simulated delay: {processing_time:.2f}s)")
            time.sleep(processing_time)
            
            # Check for simulated failure
            failure = PaymentProcessor._simulate_failure()
            if failure:
                error, error_type, error_message = failure
                raise error
            
            # Payment succeeded
            payment.status = "SUCCESS"
            payment.last_error = None
            payment.error_type = None
            payment.next_retry_at = None
            db.commit()
            
            logger.info(f"✓ Payment {payment_id} processed successfully")
            return True
            
        except PaymentError as e:
            # Payment failed - update error information
            error_type = type(e).__name__.replace("Error", "").upper()
            error_message = str(e)
            
            payment.status = "FAILED"
            payment.last_error = error_message
            payment.error_type = error_type
            payment.retry_count += 1
            
            # Calculate next retry time if retries remaining
            if payment.retry_count < payment.max_retries:
                delay = PaymentProcessor.calculate_retry_delay(payment.retry_count)
                payment.next_retry_at = datetime.utcnow() + timedelta(seconds=delay)
                logger.warning(
                    f"✗ Payment {payment_id} failed: {error_type} - {error_message}. "
                    f"Will retry in {delay}s (attempt {payment.retry_count}/{payment.max_retries})"
                )
            else:
                payment.next_retry_at = None
                logger.error(
                    f"✗ Payment {payment_id} failed after {payment.retry_count} attempts: "
                    f"{error_type} - {error_message}. Moving to DLQ."
                )
            
            db.commit()
            return False
            
        except Exception as e:
            # Unexpected error
            logger.error(f"Unexpected error processing payment {payment_id}: {e}")
            payment.status = "FAILED"
            payment.last_error = str(e)
            payment.error_type = "UNEXPECTED_ERROR"
            payment.retry_count += 1
            db.commit()
            return False
    
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
