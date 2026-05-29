"""
Payment worker service.
Continuously consumes payment events from Redis queue and processes them.
"""
import time
import logging
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.core.redis_client import get_redis
from app.db.database import SessionLocal
from app.services.payment_processor import PaymentProcessor
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
    3. Update payment status in database
    4. Acknowledge the event
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
        Process a single payment event.
        
        Args:
            event_id: Redis stream event ID
            event_data: Event payload containing payment details
        """
        try:
            payment_id = UUID(event_data.get('payment_id'))
            user_id = event_data.get('user_id')
            amount = event_data.get('amount')
            
            logger.info(
                f"Processing payment event: "
                f"payment_id={payment_id}, user_id={user_id}, amount={amount}"
            )
            
            # Create database session
            db = SessionLocal()
            
            try:
                # Process the payment
                success = self.processor.process_payment(db, payment_id)
                
                if success:
                    logger.info(f"Payment {payment_id} processed successfully")
                else:
                    logger.warning(f"Payment {payment_id} processing failed")
                
                # Acknowledge the event (remove from pending)
                self.redis.xack(self.QUEUE_NAME, self.CONSUMER_GROUP, event_id)
                logger.info(f"Event {event_id} acknowledged")
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error processing event {event_id}: {e}")
            # Event will remain in pending and can be retried
    
    def start(self):
        """
        Start the worker to continuously process events.
        
        This runs an infinite loop that:
        1. Reads events from Redis Stream
        2. Processes each event
        3. Waits for new events if queue is empty
        """
        self.running = True
        logger.info(f"Payment worker started. Listening to queue: {self.QUEUE_NAME}")
        
        while self.running:
            try:
                # Read events from the stream
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
                    # No events, just log periodically
                    logger.debug("No events in queue, waiting...")
                    
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
