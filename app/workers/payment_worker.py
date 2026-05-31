"""
Payment worker service.
Continuously consumes payment events from Redis queue and processes them.
Includes retry mechanism with exponential backoff and DLQ handling.
"""
import time
import logging
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.core.redis_client import get_redis
from app.db.database import SessionLocal
from app.services.payment_processor import PaymentProcessor
from app.services.dlq_service import dlq_service
from app.models.payment import Payment
from app.core.config import settings
from uuid import UUID

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PaymentWorker:
    """
    Worker that processes payment events from Redis queue.
    
    Architecture:
    1. Continuously read events from Redis Stream
    2. For each event, process the payment
    3. Handle retries with exponential backoff
    4. Move to DLQ after max retries
    5. Acknowledge the event
    """
    
    QUEUE_NAME = "payment_queue"
    CONSUMER_GROUP = "payment_workers"
    CONSUMER_NAME = "worker_1"
    
    def __init__(self):
        """Initialize worker with Redis and database connections."""
        self.redis = get_redis()
        self.processor = PaymentProcessor()
        self.running = False
        
        # Create consumer group if it doesn't exist
        self._create_consumer_group()
    
    def _create_consumer_group(self):
        """Create Redis consumer group for distributed processing."""
        try:
            # Try to create the consumer group
            # $ means start from the end of the stream
            self.redis.xgroup_create(
                self.QUEUE_NAME,
                self.CONSUMER_GROUP,
                id='0',  # Start from beginning for existing messages
                mkstream=True  # Create stream if it doesn't exist
            )
            logger.info(f"Created consumer group: {self.CONSUMER_GROUP}")
        except Exception as e:
            # Group already exists, which is fine
            if "BUSYGROUP" in str(e):
                logger.info(f"Consumer group {self.CONSUMER_GROUP} already exists")
            else:
                logger.error(f"Error creating consumer group: {e}")
    
    def process_event(self, event_id: str, event_data: dict):
        """
        Process a single payment event with retry and DLQ handling.
        
        Args:
            event_id: Redis stream event ID
            event_data: Event payload containing payment details
        """
        db = None
        try:
            payment_id = UUID(event_data.get('payment_id'))
            user_id = event_data.get('user_id')
            amount = float(event_data.get('amount'))
            
            logger.info(
                f"Processing payment event: "
                f"payment_id={payment_id}, user_id={user_id}, amount={amount}"
            )
            
            # Create database session
            db = SessionLocal()
            
            # Get payment from database
            payment = db.query(Payment).filter(Payment.id == payment_id).first()
            
            if not payment:
                logger.error(f"Payment {payment_id} not found in database")
                self.redis.xack(self.QUEUE_NAME, self.CONSUMER_GROUP, event_id)
                return
            
            # Check if payment should be retried
            if payment.next_retry_at and payment.next_retry_at > datetime.utcnow():
                # Not time to retry yet, skip this event
                logger.debug(
                    f"Payment {payment_id} scheduled for retry at {payment.next_retry_at}, skipping"
                )
                return
            
            # Process the payment
            success = self.processor.process_payment(db, payment_id)
            
            # Refresh payment to get updated values
            db.refresh(payment)
            
            if success:
                logger.info(f"✓ Payment {payment_id} processed successfully")
                # Acknowledge the event (remove from pending)
                self.redis.xack(self.QUEUE_NAME, self.CONSUMER_GROUP, event_id)
                logger.info(f"Event {event_id} acknowledged")
                
            else:
                # Payment failed - check if we should retry or move to DLQ
                if payment.retry_count >= payment.max_retries:
                    # Max retries exceeded - move to DLQ
                    logger.error(
                        f"Payment {payment_id} exceeded max retries ({payment.max_retries}). "
                        f"Moving to DLQ."
                    )
                    
                    # Move to DLQ
                    dlq_service.move_to_dlq(
                        payment_id=payment_id,
                        user_id=user_id,
                        amount=amount,
                        error_message=payment.last_error or "Unknown error",
                        error_type=payment.error_type or "UNKNOWN",
                        retry_count=payment.retry_count
                    )
                    
                    # Update payment status to DLQ
                    payment.status = "DLQ"
                    payment.moved_to_dlq_at = datetime.utcnow()
                    db.commit()
                    
                    # Acknowledge the event (remove from queue)
                    self.redis.xack(self.QUEUE_NAME, self.CONSUMER_GROUP, event_id)
                    logger.info(f"Event {event_id} acknowledged and moved to DLQ")
                    
                else:
                    # Will retry - calculate delay
                    delay = PaymentProcessor.calculate_retry_delay(payment.retry_count)
                    logger.warning(
                        f"Payment {payment_id} will be retried in {delay}s "
                        f"(attempt {payment.retry_count}/{payment.max_retries})"
                    )
                    # Don't acknowledge yet - will be retried
                
        except Exception as e:
            logger.error(f"Error processing event {event_id}: {e}", exc_info=True)
            # Event will remain in pending and can be retried
            
        finally:
            if db:
                db.close()
    
    def _process_pending_events(self):
        """
        Process pending events that are ready for retry.
        
        Checks for events that were not acknowledged (pending) and processes
        them if their retry time has arrived.
        """
        try:
            # Get pending events for this consumer
            # XPENDING shows events that were read but not acknowledged
            pending_info = self.redis.xpending_range(
                self.QUEUE_NAME,
                self.CONSUMER_GROUP,
                min='-',
                max='+',
                count=10,
                consumername=self.CONSUMER_NAME
            )
            
            if pending_info:
                logger.debug(f"Found {len(pending_info)} pending events to check")
                
                for pending in pending_info:
                    event_id = pending['message_id']
                    
                    # Claim the event to process it
                    # XCLAIM transfers ownership of pending messages
                    claimed = self.redis.xclaim(
                        self.QUEUE_NAME,
                        self.CONSUMER_GROUP,
                        self.CONSUMER_NAME,
                        min_idle_time=0,  # Claim immediately
                        message_ids=[event_id]
                    )
                    
                    if claimed:
                        for claimed_id, event_data in claimed:
                            self.process_event(claimed_id, event_data)
                            
        except Exception as e:
            logger.error(f"Error processing pending events: {e}")
    
    def start(self):
        """
        Start the worker to continuously process events.
        
        This runs an infinite loop that:
        1. First checks for pending events ready for retry
        2. Then reads new events from Redis Stream
        3. Processes each event
        4. Waits for new events if queue is empty
        """
        self.running = True
        logger.info(f"Payment worker started. Listening to queue: {self.QUEUE_NAME}")
        
        while self.running:
            try:
                # STEP 1: Process pending events that might be ready for retry
                self._process_pending_events()
                
                # STEP 2: Read new events from the stream
                # XREADGROUP reads from consumer group for distributed processing
                # block=1000 means wait up to 1 second for new events
                # count=10 means read up to 10 events at a time
                events = self.redis.xreadgroup(
                    self.CONSUMER_GROUP,
                    self.CONSUMER_NAME,
                    {self.QUEUE_NAME: '>'},  # > means read new messages
                    count=10,
                    block=1000  # Block for 1 second
                )
                
                if events:
                    # events format: [(stream_name, [(event_id, event_data), ...])]
                    for stream_name, stream_events in events:
                        for event_id, event_data in stream_events:
                            self.process_event(event_id, event_data)
                else:
                    # No new events, just log periodically
                    logger.debug("No new events in queue, waiting...")
                    
            except KeyboardInterrupt:
                logger.info("Worker interrupted by user")
                self.stop()
                break
            except Exception as e:
                logger.error(f"Error in worker loop: {e}")
                time.sleep(5)  # Wait before retrying
    
    def stop(self):
        """Stop the worker gracefully."""
        logger.info("Stopping payment worker...")
        self.running = False


def main():
    """Main entry point for the worker."""
    logger.info("=" * 60)
    logger.info("PayFlow Payment Worker")
    logger.info("=" * 60)
    
    worker = PaymentWorker()
    
    try:
        worker.start()
    except KeyboardInterrupt:
        logger.info("\nShutting down worker...")
    finally:
        worker.stop()
        logger.info("Worker stopped")


if __name__ == "__main__":
    main()

# Made with Bob
