"""
Payment API endpoints.
Defines the REST API routes for payment operations.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.database import get_db
from app.schemas.payment import PaymentCreate, PaymentResponse, PaymentCreateResponse
from app.services.payment_service import PaymentService

# Create router for payment endpoints
router = APIRouter(
    prefix="/payments",
    tags=["payments"]
)


@router.post(
    "",
    response_model=PaymentCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new payment",
    description="Creates a new payment transaction with PENDING status"
)
def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new payment.
    
    - **user_id**: ID of the user making the payment
    - **amount**: Payment amount (must be greater than 0)
    
    Returns the payment ID and initial status (PENDING).
    """
    # Create payment using service layer
    new_payment = PaymentService.create_payment(db, payment)
    
    # Return simplified response
    return PaymentCreateResponse(
        payment_id=new_payment.id,
        status=new_payment.status
    )


@router.get(
    "/{payment_id}",
    response_model=PaymentResponse,
    summary="Get payment details",
    description="Retrieve details of a specific payment by ID"
)
def get_payment(
    payment_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get payment by ID.
    
    - **payment_id**: UUID of the payment to retrieve
    
    Returns complete payment details including status, amount, and timestamps.
    """
    # Fetch payment from database
    payment = PaymentService.get_payment_by_id(db, payment_id)
    
    # Return 404 if payment not found
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with ID {payment_id} not found"
        )
    
    return payment


@router.get(
    "/user/{user_id}",
    response_model=list[PaymentResponse],
    summary="Get user's payments",
    description="Retrieve all payments for a specific user"
)
def get_user_payments(
    user_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all payments for a user.
    
    - **user_id**: ID of the user
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return
    
    Returns a list of payments for the specified user.
    """
    payments = PaymentService.get_payments_by_user(db, user_id, skip, limit)
    return payments

# Made with Bob
