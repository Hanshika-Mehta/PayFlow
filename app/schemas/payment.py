"""
Pydantic schemas for Payment API requests and responses.
These define the structure and validation for API data.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal


class PaymentCreate(BaseModel):
    """
    Schema for creating a new payment.
    This is what the client sends in POST /payments
    """
    user_id: str = Field(..., description="User ID initiating the payment", min_length=1)
    amount: Decimal = Field(..., description="Payment amount", gt=0)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "user_123",
                "amount": 500.00
            }
        }
    )


class PaymentResponse(BaseModel):
    """
    Schema for payment response.
    This is what the API returns to the client.
    """
    id: UUID = Field(..., description="Unique payment ID")
    user_id: str = Field(..., description="User ID")
    amount: Decimal = Field(..., description="Payment amount")
    status: str = Field(..., description="Payment status: PENDING, PROCESSING, SUCCESS, FAILED")
    retry_count: int = Field(..., description="Number of retry attempts")
    created_at: datetime = Field(..., description="Payment creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    model_config = ConfigDict(
        from_attributes=True,  # Allows creating from ORM models
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "user_123",
                "amount": 500.00,
                "status": "PENDING",
                "retry_count": 0,
                "created_at": "2024-01-01T12:00:00",
                "updated_at": "2024-01-01T12:00:00"
            }
        }
    )


class PaymentCreateResponse(BaseModel):
    """
    Simplified response for payment creation.
    Returns only essential information immediately after creation.
    """
    payment_id: UUID = Field(..., description="Unique payment ID")
    status: str = Field(..., description="Initial payment status")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "payment_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "PENDING"
            }
        }
    )

# Made with Bob
