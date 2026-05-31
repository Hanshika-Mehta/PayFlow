"""
Monitoring API endpoints.
Provides queue status, worker status, and system metrics.
"""
from fastapi import APIRouter, Depends
from app.core.redis_client import get_redis
from app.db.database import get_db
from sqlalchemy.orm import Session
from app.models.payment import Payment
import redis
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api",
    tags=["monitoring"]
)


@router.get("/queue/status")
def get_queue_status():
    """
    Get current queue status.
    
    Returns:
        Queue length, pending payments, and throughput
    """
    try:
        redis_client = get_redis()
        
        # Get queue length
        queue_length = redis_client.xlen("payment_queue")
        
        # Get pending payments (last 10)
        pending = []
        try:
            events = redis_client.xrevrange("payment_queue", count=10)
            for event_id, event_data in events:
                pending.append(event_data.get('payment_id', 'unknown'))
        except Exception as e:
            logger.error(f"Error getting pending payments: {e}")
        
        return {
            "queue_length": queue_length,
            "pending_payments": pending,
            "throughput": 0  # Will be calculated later with metrics
        }
    except Exception as e:
        logger.error(f"Error getting queue status: {e}")
        return {
            "queue_length": 0,
            "pending_payments": [],
            "throughput": 0,
            "error": str(e)
        }


@router.get("/worker/status")
def get_worker_status():
    """
    Get worker status.
    
    Returns:
        Worker information and statistics
    """
    # This is a simplified version
    # In production, workers would report their status to Redis
    return {
        "worker_id": "worker_1",
        "status": "idle",
        "current_job": None,
        "jobs_completed": 0,
        "success_rate": 0.0
    }


@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db)):
    """
    Get system metrics.
    
    Returns:
        Overall system statistics
    """
    try:
        redis_client = get_redis()
        
        # Get total payments
        total_payments = db.query(Payment).count()
        
        # Get success count
        success_count = db.query(Payment).filter(Payment.status == "SUCCESS").count()
        
        # Get processing count
        processing_count = db.query(Payment).filter(Payment.status == "PROCESSING").count()
        
        # Get failed count
        failed_count = db.query(Payment).filter(Payment.status == "FAILED").count()
        
        # Get pending count
        pending_count = db.query(Payment).filter(Payment.status == "PENDING").count()
        
        # Calculate success rate
        success_rate = (success_count / total_payments * 100) if total_payments > 0 else 0
        
        # Get queue depth
        queue_depth = redis_client.xlen("payment_queue")
        
        return {
            "total_payments": total_payments,
            "successful": success_count,
            "processing": processing_count,
            "failed": failed_count,
            "pending": pending_count,
            "success_rate": round(success_rate, 2),
            "avg_latency_ms": 0,
            "queue_depth": queue_depth,
            "active_workers": 1
        }
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        return {
            "total_payments": 0,
            "successful": 0,
            "processing": 0,
            "failed": 0,
            "pending": 0,
            "success_rate": 0,
            "avg_latency_ms": 0,
            "queue_depth": 0,
            "active_workers": 0,
            "error": str(e)
        }


@router.get("/payments/{payment_id}/timeline")
def get_payment_timeline(payment_id: str, db: Session = Depends(get_db)):
    """
    Get payment timeline (simplified version).
    
    In production, this would track all state transitions with timestamps.
    """
    from uuid import UUID
    
    try:
        payment = db.query(Payment).filter(Payment.id == UUID(payment_id)).first()
        
        if not payment:
            return {"error": "Payment not found"}
        
        # Simplified timeline based on current status
        events = [
            {
                "state": "PENDING",
                "timestamp": payment.created_at.isoformat(),
            }
        ]
        
        if payment.status in ["PROCESSING", "SUCCESS", "FAILED"]:
            events.append({
                "state": "PROCESSING",
                "timestamp": payment.updated_at.isoformat(),
            })
        
        if payment.status in ["SUCCESS", "FAILED"]:
            events.append({
                "state": payment.status,
                "timestamp": payment.updated_at.isoformat(),
            })
        
        return {
            "payment_id": str(payment.id),
            "events": events
        }
    except Exception as e:
        logger.error(f"Error getting payment timeline: {e}")
        return {"error": str(e)}


@router.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Get dashboard statistics for real-time display.
    
    Returns:
        Dashboard stats including payment counts by status
    """
    try:
        redis_client = get_redis()
        
        # Get counts by status
        total_payments = db.query(Payment).count()
        successful = db.query(Payment).filter(Payment.status == "SUCCESS").count()
        processing = db.query(Payment).filter(Payment.status == "PROCESSING").count()
        failed = db.query(Payment).filter(Payment.status == "FAILED").count()
        pending = db.query(Payment).filter(Payment.status == "PENDING").count()
        
        # Calculate percentages
        success_rate = (successful / total_payments * 100) if total_payments > 0 else 0
        processing_rate = (processing / total_payments * 100) if total_payments > 0 else 0
        failed_rate = (failed / total_payments * 100) if total_payments > 0 else 0
        
        # Get queue length
        queue_length = redis_client.xlen("payment_queue")
        
        return {
            "total_payments": total_payments,
            "successful": successful,
            "success_rate": round(success_rate, 1),
            "processing": processing,
            "processing_rate": round(processing_rate, 1),
            "failed": failed,
            "failed_rate": round(failed_rate, 1),
            "pending": pending,
            "queue_length": queue_length,
            "active_workers": 1  # TODO: Track actual worker count
        }
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        return {
            "total_payments": 0,
            "successful": 0,
            "success_rate": 0,
            "processing": 0,
            "processing_rate": 0,
            "failed": 0,
            "failed_rate": 0,
            "pending": 0,
            "queue_length": 0,
            "active_workers": 0,
            "error": str(e)
        }


@router.get("/queue/contents")
def get_queue_contents():
    """
    Get actual queue contents from Redis.
    
    Returns:
        List of payment IDs currently in the queue
    """
    try:
        redis_client = get_redis()
        
        # Get last 100 items from the queue to show more
        queue_items = []
        try:
            events = redis_client.xrevrange("payment_queue", count=100)
            for event_id, event_data in events:
                # Decode bytes to string
                decoded_data = {}
                for key, value in event_data.items():
                    key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                    value_str = value.decode('utf-8') if isinstance(value, bytes) else value
                    decoded_data[key_str] = value_str
                
                queue_items.append({
                    "payment_id": decoded_data.get('payment_id', 'unknown'),
                    "event_id": event_id.decode('utf-8') if isinstance(event_id, bytes) else event_id,
                    "timestamp": decoded_data.get('timestamp', ''),
                    "user_id": decoded_data.get('user_id', ''),
                    "amount": decoded_data.get('amount', '')
                })
        except Exception as e:
            logger.error(f"Error reading queue contents: {e}")
            logger.exception(e)
        
        return {
            "queue_length": redis_client.xlen("payment_queue"),
            "items": queue_items
        }
    except Exception as e:
        logger.error(f"Error getting queue contents: {e}")
        return {
            "queue_length": 0,
            "items": [],
            "error": str(e)
        }


@router.get("/payments/recent")
def get_recent_payments(limit: int = 10, db: Session = Depends(get_db)):
    """
    Get recent payments for display.
    
    Returns:
        List of recent payments with details
    """
    try:
        payments = db.query(Payment).order_by(Payment.created_at.desc()).limit(limit).all()
        
        return {
            "payments": [
                {
                    "id": str(payment.id),
                    "user_id": payment.user_id,
                    "amount": str(payment.amount),
                    "status": payment.status,
                    "retry_count": payment.retry_count,
                    "created_at": payment.created_at.isoformat(),
                    "updated_at": payment.updated_at.isoformat()
                }
                for payment in payments
            ]
        }
    except Exception as e:
        logger.error(f"Error getting recent payments: {e}")
        return {
            "payments": [],
            "error": str(e)
        }

@router.get("/monitoring/queue")
def get_queue_monitoring():
    """
    Get detailed queue monitoring data.
    
    Returns:
        Queue statistics including pending, processing, throughput
    """
    try:
        redis_client = get_redis()
        
        # Get queue length
        queue_length = redis_client.xlen("payment_queue")
        
        # Get pending groups info
        try:
            groups_info = redis_client.xinfo_groups("payment_queue")
            pending_count = sum(group.get('pending', 0) for group in groups_info)
        except:
            pending_count = queue_length
        
        return {
            "pending_count": queue_length,
            "processing_count": 0,  # Would need worker tracking
            "total_processed": 0,   # Would need metrics tracking
            "lag_seconds": 0,       # Would need timestamp tracking
            "throughput": 0         # Would need rate calculation
        }
    except Exception as e:
        logger.error(f"Error getting queue monitoring: {e}")
        return {
            "pending_count": 0,
            "processing_count": 0,
            "total_processed": 0,
            "lag_seconds": 0,
            "throughput": 0,
            "error": str(e)
        }


@router.get("/monitoring/workers")
def get_worker_monitoring():
    """
    Get detailed worker monitoring data.
    
    Returns:
        Worker statistics and status
    """
    try:
        # In production, workers would report their status to Redis
        # For now, return basic stats
        return {
            "active_workers": 1,
            "idle_workers": 0,
            "total_processed": 0,
            "avg_processing_time": 0,
            "success_rate": 0
        }
    except Exception as e:
        logger.error(f"Error getting worker monitoring: {e}")
        return {
            "active_workers": 0,
            "idle_workers": 0,
            "total_processed": 0,
            "avg_processing_time": 0,
            "success_rate": 0,
            "error": str(e)
        }

# Made with Bob
