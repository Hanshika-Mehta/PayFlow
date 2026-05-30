"""
Retry and DLQ monitoring endpoints.
Provides APIs for monitoring retry statistics and Dead Letter Queue.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from uuid import UUID
from datetime import datetime

from app.db.database import get_db
from app.models.payment import Payment
from app.services.dlq_service import dlq_service
from app.services.queue_service import queue_service

router = APIRouter(prefix="/monitoring", tags=["monitoring"])


@router.get("/retry-stats")
async def get_retry_stats(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get retry statistics for payments.
    
    Returns:
        Dictionary with retry statistics including:
        - Total payments with retries
        - Retry count distribution
        - Payments pending retry
        - Average retry count
    """
    try:
        # Total payments with retries
        total_with_retries = db.query(Payment).filter(Payment.retry_count > 0).count()
        
        # Retry count distribution
        retry_distribution = db.query(
            Payment.retry_count,
            func.count(Payment.id).label('count')
        ).filter(
            Payment.retry_count > 0
        ).group_by(
            Payment.retry_count
        ).all()
        
        distribution = {str(retry): count for retry, count in retry_distribution}
        
        # Payments pending retry (FAILED status with next_retry_at set)
        pending_retry = db.query(Payment).filter(
            Payment.status == "FAILED",
            Payment.next_retry_at.isnot(None),
            Payment.next_retry_at > datetime.utcnow()
        ).count()
        
        # Payments ready for retry (FAILED status with next_retry_at in past)
        ready_for_retry = db.query(Payment).filter(
            Payment.status == "FAILED",
            Payment.next_retry_at.isnot(None),
            Payment.next_retry_at <= datetime.utcnow()
        ).count()
        
        # Average retry count
        avg_retry = db.query(func.avg(Payment.retry_count)).filter(
            Payment.retry_count > 0
        ).scalar() or 0
        
        # Error type distribution
        error_distribution = db.query(
            Payment.error_type,
            func.count(Payment.id).label('count')
        ).filter(
            Payment.error_type.isnot(None)
        ).group_by(
            Payment.error_type
        ).all()
        
        error_types = {error_type: count for error_type, count in error_distribution}
        
        # Recent failed payments
        recent_failures = db.query(Payment).filter(
            Payment.status == "FAILED"
        ).order_by(
            Payment.updated_at.desc()
        ).limit(10).all()
        
        recent_failures_list = [
            {
                "payment_id": str(payment.id),
                "user_id": payment.user_id,
                "amount": float(payment.amount),
                "retry_count": payment.retry_count,
                "error_type": payment.error_type,
                "last_error": payment.last_error,
                "next_retry_at": payment.next_retry_at.isoformat() if payment.next_retry_at else None,
                "updated_at": payment.updated_at.isoformat()
            }
            for payment in recent_failures
        ]
        
        return {
            "total_payments_with_retries": total_with_retries,
            "retry_count_distribution": distribution,
            "pending_retry": pending_retry,
            "ready_for_retry": ready_for_retry,
            "average_retry_count": round(float(avg_retry), 2),
            "error_type_distribution": error_types,
            "recent_failures": recent_failures_list
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get retry stats: {str(e)}")


@router.get("/dlq")
async def get_dlq_messages(
    count: int = 100,
    start_id: str = "-"
) -> Dict[str, Any]:
    """
    Get messages from the Dead Letter Queue.
    
    Args:
        count: Maximum number of messages to retrieve (default: 100)
        start_id: Start reading from this ID (default: "-" for beginning)
        
    Returns:
        Dictionary with DLQ messages and metadata
    """
    try:
        messages = dlq_service.get_dlq_messages(count=count, start_id=start_id)
        length = dlq_service.get_dlq_length()
        
        return {
            "dlq_length": length,
            "messages_returned": len(messages),
            "messages": messages
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get DLQ messages: {str(e)}")


@router.get("/dlq/stats")
async def get_dlq_stats() -> Dict[str, Any]:
    """
    Get statistics about the Dead Letter Queue.
    
    Returns:
        Dictionary with DLQ statistics including:
        - Total messages in DLQ
        - Error type distribution
        - Recent messages
    """
    try:
        stats = dlq_service.get_dlq_stats()
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get DLQ stats: {str(e)}")


@router.post("/dlq/{payment_id}/retry")
async def retry_from_dlq(
    payment_id: UUID,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Manually retry a payment from the DLQ.
    
    This resets the payment status and retry count, allowing it to be processed again.
    
    Args:
        payment_id: UUID of the payment to retry
        
    Returns:
        Success message with payment details
    """
    try:
        # Get payment from database
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        
        if not payment:
            raise HTTPException(status_code=404, detail=f"Payment {payment_id} not found")
        
        if payment.status != "DLQ":
            raise HTTPException(
                status_code=400,
                detail=f"Payment {payment_id} is not in DLQ (current status: {payment.status})"
            )
        
        # Reset payment for retry
        payment.status = "PENDING"
        payment.retry_count = 0
        payment.last_error = None
        payment.error_type = None
        payment.next_retry_at = None
        payment.moved_to_dlq_at = None
        db.commit()
        
        # Republish to queue
        queue_service.publish_payment_event(
            payment_id=payment.id,
            user_id=payment.user_id,
            amount=float(payment.amount)
        )
        
        return {
            "message": f"Payment {payment_id} reset and republished for retry",
            "payment_id": str(payment.id),
            "status": payment.status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to retry payment: {str(e)}")


@router.delete("/dlq/{event_id}")
async def remove_from_dlq(event_id: str) -> Dict[str, str]:
    """
    Remove a message from the DLQ.
    
    Args:
        event_id: Redis stream event ID to remove
        
    Returns:
        Success message
    """
    try:
        success = dlq_service.remove_from_dlq(event_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to remove message from DLQ")
        
        return {
            "message": f"Event {event_id} removed from DLQ",
            "event_id": event_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove from DLQ: {str(e)}")


# Made with Bob