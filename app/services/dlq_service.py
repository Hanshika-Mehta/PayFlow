"""
Dead Letter Queue (DLQ) service.
Manages failed payments that have exceeded retry limits.
"""
import json
import logging
from typing import Dict, Any, List, Optional
from uuid import UUID
from datetime import datetime
from app.core.redis_client import get_redis
from app.core.config import settings

logger = logging.getLogger(__name__)


class DLQService:
    """Service for managing Dead Letter Queue operations."""
    
    def __init__(self):
        """Initialize DLQ service with Redis client."""
        self.redis = get_redis()
        self.dlq_stream = settings.DLQ_STREAM_NAME
    
    def move_to_dlq(
        self,
        payment_id: UUID,
        user_id: str,
        amount: float,
        error_message: str,
        error_type: str,
        retry_count: int
    ) -> Optional[str]:
        """
        Move a failed payment to the Dead Letter Queue.
        
        Args:
            payment_id: UUID of the failed payment
            user_id: User ID
            amount: Payment amount
            error_message: Error message from last failure
            error_type: Type of error (e.g., GATEWAY_TIMEOUT, NETWORK_ERROR)
            retry_count: Number of retry attempts made
            
        Returns:
            Event ID if successful, None otherwise
        """
        try:
            # Create DLQ event payload
            dlq_data = {
                "payment_id": str(payment_id),
                "user_id": user_id,
                "amount": str(amount),
                "error_message": error_message,
                "error_type": error_type,
                "retry_count": str(retry_count),
                "moved_to_dlq_at": datetime.utcnow().isoformat(),
                "event_type": "payment_dlq"
            }
            
            # Add to DLQ stream
            event_id = self.redis.xadd(
                self.dlq_stream,
                dlq_data,
                maxlen=settings.DLQ_MAX_LENGTH
            )
            
            logger.warning(
                f"Payment {payment_id} moved to DLQ after {retry_count} retries. "
                f"Error: {error_type} - {error_message}"
            )
            
            return event_id
            
        except Exception as e:
            logger.error(f"Failed to move payment {payment_id} to DLQ: {e}")
            return None
    
    def get_dlq_messages(
        self,
        count: int = 100,
        start_id: str = "-"
    ) -> List[Dict[str, Any]]:
        """
        Get messages from the DLQ.
        
        Args:
            count: Maximum number of messages to retrieve
            start_id: Start reading from this ID (- means from beginning)
            
        Returns:
            List of DLQ messages with metadata
        """
        try:
            # Read from DLQ stream
            messages = self.redis.xrange(
                self.dlq_stream,
                min=start_id,
                max="+",
                count=count
            )
            
            dlq_list = []
            for event_id, event_data in messages:
                dlq_list.append({
                    "event_id": event_id,
                    "payment_id": event_data.get("payment_id"),
                    "user_id": event_data.get("user_id"),
                    "amount": float(event_data.get("amount", 0)),
                    "error_message": event_data.get("error_message"),
                    "error_type": event_data.get("error_type"),
                    "retry_count": int(event_data.get("retry_count", 0)),
                    "moved_to_dlq_at": event_data.get("moved_to_dlq_at")
                })
            
            return dlq_list
            
        except Exception as e:
            logger.error(f"Failed to get DLQ messages: {e}")
            return []
    
    def get_dlq_length(self) -> int:
        """
        Get the current length of the DLQ.
        
        Returns:
            Number of messages in DLQ
        """
        try:
            return self.redis.xlen(self.dlq_stream)
        except Exception as e:
            logger.error(f"Failed to get DLQ length: {e}")
            return 0
    
    def get_dlq_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the DLQ.
        
        Returns:
            Dictionary with DLQ statistics
        """
        try:
            length = self.get_dlq_length()
            
            # Get error type distribution
            messages = self.get_dlq_messages(count=1000)
            error_types = {}
            for msg in messages:
                error_type = msg.get("error_type", "UNKNOWN")
                error_types[error_type] = error_types.get(error_type, 0) + 1
            
            return {
                "dlq_name": self.dlq_stream,
                "total_messages": length,
                "error_type_distribution": error_types,
                "recent_messages": messages[:10]  # Last 10 messages
            }
            
        except Exception as e:
            logger.error(f"Failed to get DLQ stats: {e}")
            return {
                "dlq_name": self.dlq_stream,
                "total_messages": 0,
                "error": str(e)
            }
    
    def remove_from_dlq(self, event_id: str) -> bool:
        """
        Remove a message from the DLQ.
        
        Args:
            event_id: Redis stream event ID to remove
            
        Returns:
            True if removed successfully, False otherwise
        """
        try:
            self.redis.xdel(self.dlq_stream, event_id)
            logger.info(f"Removed event {event_id} from DLQ")
            return True
        except Exception as e:
            logger.error(f"Failed to remove event {event_id} from DLQ: {e}")
            return False


# Global DLQ service instance
dlq_service = DLQService()

# Made with Bob