from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from app.core.auth import get_current_user, supabase_admin
from app.models.expense import ExpenseCreate, ExpenseImport, ExpenseOut, ExpenseUpdate

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


@router.post("/import", response_model=list[ExpenseOut])
def import_expenses(payload: ExpenseImport, user=Depends(get_current_user)):
    rows = [
        {
            "user_id": user.id,
            "amount": transaction.amount,
            "category": transaction.category or "Uncategorized",
            "description": transaction.description,
            "txn_date": transaction.txn_date.isoformat(),
        }
        for transaction in payload.transactions
    ]
    result = supabase_admin.table("expenses").insert(rows).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Could not import expenses")
    return result.data


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


@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: UUID, payload: ExpenseUpdate, user=Depends(get_current_user)):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    for key, value in list(updates.items()):
        if value is None:
            continue
        if key == "txn_date":
            updates[key] = value.isoformat()

    result = (
        supabase_admin.table("expenses")
        .update(updates)
        .eq("id", str(expense_id))
        .eq("user_id", user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Expense not found")
    return result.data[0]


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
