from pydantic import BaseModel, Field
from datetime import date
from typing import Optional
from uuid import UUID


class ExpenseCreate(BaseModel):
    amount: float = Field(gt=0)
    category: Optional[str] = None  # if None, Step 3's classifier will fill this in
    description: str
    txn_date: date


class ExpenseOut(BaseModel):
    id: UUID
    user_id: UUID
    amount: float
    category: str
    description: str
    txn_date: date


class ExpenseImport(BaseModel):
    transactions: list[ExpenseCreate] = Field(min_length=1, max_length=2000)
