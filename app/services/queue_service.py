"""
Queue service for publishing and consuming events using Redis Streams.
Handles payment event publishing to the queue.
"""
import json
import logging
from typing import Dict, Any, Optional
from uuid import UUID
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)


class QueueService:
    """Service for managing payment queue operations using Redis Streams."""
    
    # Queue names
    PAYMENT_QUEUE = "payment_queue"
    
    def __init__(self):
        """Initialize queue service with Redis client."""
        self.redis = get_redis()
    
    def publish_payment_event(
        self,
        payment_id: UUID,
        user_id: str,
        amount: float
    ) -> Optional[str]:
        """
        Publish a payment event to the queue.
        
        Args:
            payment_id: UUID of the payment
            user_id: User ID who initiated the payment
            amount: Payment amount
            
        Returns:
            Event ID if successful, None otherwise
        """
        try:
            # Create event payload
            event_data = {
                "payment_id": str(payment_id),
                "user_id": user_id,
                "amount": str(amount),
                "event_type": "payment_created"
            }
            
            # Publish to Redis Stream
            # XADD adds a new entry to the stream
            event_id = self.redis.xadd(
                self.PAYMENT_QUEUE,
                event_data,
                maxlen=10000  # Keep last 10000 events (prevents unbounded growth)
            )
            
            logger.info(
                f"Published payment event: payment_id={payment_id}, "
                f"event_id={event_id}"
            )
            
            return event_id
            
        except Exception as e:
            logger.error(f"Failed to publish payment event: {e}")
            return None
    
    def get_queue_length(self) -> int:
        """
        Get the current length of the payment queue.
        
        Returns:
            Number of events in the queue
        """
        try:
            return self.redis.xlen(self.PAYMENT_QUEUE)
        except Exception as e:
            logger.error(f"Failed to get queue length: {e}")
            return 0
    
    def get_queue_info(self) -> Dict[str, Any]:
        """
        Get information about the payment queue.
        
        Returns:
            Dictionary with queue statistics
        """
        try:
            length = self.get_queue_length()
            info = self.redis.xinfo_stream(self.PAYMENT_QUEUE)
            
            return {
                "queue_name": self.PAYMENT_QUEUE,
                "length": length,
                "first_entry": info.get("first-entry"),
                "last_entry": info.get("last-entry"),
                "groups": info.get("groups", 0)
            }
        except Exception as e:
            logger.error(f"Failed to get queue info: {e}")
            return {
                "queue_name": self.PAYMENT_QUEUE,
                "length": 0,
                "error": str(e)
            }


# Global queue service instance
queue_service = QueueService()

# Made with Bob
