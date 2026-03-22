from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from models.transaction import TransactionType, TransactionStatus, Currency


class WalletOut(BaseModel):
    balance: float
    stars_balance: int
    ton_balance: float = 0.0
    total_earned: float = 0.0
    total_withdrawn: float = 0.0
    pending_clearance: float = 0.0


class TransactionOut(BaseModel):
    id: UUID
    user_id: UUID
    order_id: Optional[UUID] = None
    type: TransactionType
    amount: Optional[float] = None
    stars_amount: Optional[int] = None
    currency: Currency
    status: TransactionStatus
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WithdrawRequest(BaseModel):
    amount: float
    method: str  # bank_card | crypto
    details: str  # card number or crypto address


class DepositRequest(BaseModel):
    amount: float
    method: str  # stars | ton | card
