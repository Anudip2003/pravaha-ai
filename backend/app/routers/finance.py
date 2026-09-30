from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user, supabase_admin
from app.core.financial_analysis import build_financial_overview
from app.models.finance import FinanceSettingsUpdate

router = APIRouter(prefix="/finance", tags=["finance"])

DEFAULT_SETTINGS = {
    "monthly_income": 0,
    "category_budgets": {},
    "recurring_expenses": [],
}


def get_finance_settings(user_id):
    try:
        result = (
            supabase_admin.table("finance_settings")
            .select("monthly_income,category_budgets,recurring_expenses")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Cash-flow settings are unavailable. Run backend/supabase_finance_settings.sql in Supabase first.",
        )

    if not result.data:
        return DEFAULT_SETTINGS.copy()
    return {**DEFAULT_SETTINGS, **result.data[0]}


def get_user_expenses(user_id):
    try:
        result = (
            supabase_admin.table("expenses")
            .select("amount,category,description,txn_date")
            .eq("user_id", user_id)
            .order("txn_date", desc=True)
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=503, detail="Could not load your expense history.")
    return result.data or []


@router.get("/overview")
def get_overview(user=Depends(get_current_user)):
    settings = get_finance_settings(user.id)
    expenses = get_user_expenses(user.id)
    return {
        "settings": settings,
        **build_financial_overview(expenses, settings),
    }


@router.put("/settings")
def update_settings(payload: FinanceSettingsUpdate, user=Depends(get_current_user)):
    settings = payload.model_dump(mode="json")
    row = {"user_id": user.id, **settings}
    try:
        supabase_admin.table("finance_settings").upsert(row, on_conflict="user_id").execute()
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Cash-flow settings are unavailable. Run backend/supabase_finance_settings.sql in Supabase first.",
        )
    return settings