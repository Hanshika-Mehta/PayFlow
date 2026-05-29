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
        
        # Get failed count
        failed_count = db.query(Payment).filter(Payment.status == "FAILED").count()
        
        # Calculate success rate
        success_rate = (success_count / total_payments * 100) if total_payments > 0 else 0
        
        # Get queue depth
        queue_depth = redis_client.xlen("payment_queue")
        
        return {
            "total_payments": total_payments,
            "success_rate": round(success_rate, 2),
            "avg_latency_ms": 0,  # Will be calculated with proper metrics
            "queue_depth": queue_depth,
            "active_workers": 1
        }
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        return {
            "total_payments": 0,
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

# Made with Bob
