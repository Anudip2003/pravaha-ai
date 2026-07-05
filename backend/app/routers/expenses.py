from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from app.core.auth import get_current_user, supabase_admin
from app.models.expense import ExpenseCreate, ExpenseOut

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("", response_model=ExpenseOut)
def create_expense(payload: ExpenseCreate, user=Depends(get_current_user)):
    row = {
        "user_id": user.id,
        "amount": payload.amount,
        # Step 3 will replace this fallback with the ML category classifier
        "category": payload.category or "Uncategorized",
        "description": payload.description,
        "txn_date": payload.txn_date.isoformat(),
    }
    result = supabase_admin.table("expenses").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Could not create expense")
    return result.data[0]


@router.get("", response_model=list[ExpenseOut])
def list_expenses(user=Depends(get_current_user)):
    result = (
        supabase_admin.table("expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("txn_date", desc=True)
        .execute()
    )
    return result.data


@router.delete("/{expense_id}")
def delete_expense(expense_id: UUID, user=Depends(get_current_user)):
    result = (
        supabase_admin.table("expenses")
        .delete()
        .eq("id", str(expense_id))
        .eq("user_id", user.id)  # ensures users can only delete their own rows
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"deleted": True}
