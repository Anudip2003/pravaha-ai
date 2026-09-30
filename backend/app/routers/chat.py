from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import httpx

from app.core.auth import get_current_user, supabase_admin
from app.core.financial_analysis import build_financial_overview
from app.core.config import settings
from app.routers.finance import get_finance_settings

router = APIRouter(prefix="/chat", tags=["chat"])

SYSTEM_PROMPT = """You are Pravaha's AI finance advisor for India.
Help users with budgeting, SIP, mutual funds, tax saving, and investments.
Give India-specific advice. Never recommend specific stocks. This is educational guidance only.
When dashboard expense data is provided, use it to answer questions about the user's spending.
Do not claim data that is not present, and do not infer income, savings, or investments from expenses.
Distinguish clearly between recorded expenses and general financial guidance."""

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[Message]


def dashboard_context(user_id: str) -> str:
    result = (
        supabase_admin.table("expenses")
        .select("amount,category,description,txn_date")
        .eq("user_id", user_id)
        .order("txn_date", desc=True)
        .execute()
    )
    expenses = result.data or []
    current_month = date.today().strftime("%Y-%m")
    month_expenses = [
        expense for expense in expenses
        if str(expense.get("txn_date", "")).startswith(current_month)
    ]
    month_total = sum(float(expense.get("amount") or 0) for expense in month_expenses)
    all_time_total = sum(float(expense.get("amount") or 0) for expense in expenses)

    category_totals = {}
    monthly_totals = {}
    for expense in month_expenses:
        category = expense.get("category") or "Uncategorized"
        category_totals[category] = category_totals.get(category, 0) + float(expense.get("amount") or 0)
    for expense in expenses:
        month = str(expense.get("txn_date", ""))[:7]
        if month:
            monthly_totals[month] = monthly_totals.get(month, 0) + float(expense.get("amount") or 0)

    category_summary = ", ".join(
        f"{category}: INR {amount:,.2f}"
        for category, amount in sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
    ) or "No expenses recorded this month"
    monthly_summary = ", ".join(
        f"{month}: INR {amount:,.2f}"
        for month, amount in sorted(monthly_totals.items())[-6:]
    ) or "No monthly history recorded"
    recent_expenses = "\n".join(
        f"- {expense.get('txn_date')}: {expense.get('description', 'Expense')} "
        f"(INR {float(expense.get('amount') or 0):,.2f}, {expense.get('category') or 'Uncategorized'})"
        for expense in expenses[:10]
    ) or "No transactions recorded"
    try:
        finance_settings = get_finance_settings(user_id)
    except HTTPException:
        finance_settings = {}
    overview = build_financial_overview(expenses, finance_settings)
    budget_summary = ", ".join(
        f"{budget['category']}: monthly limit INR {budget['limit']:,.2f}, "
        f"spent INR {budget['spent']:,.2f}, projected INR {budget['forecast']:,.2f}"
        for budget in overview["budgets"]
    ) or "No category budgets set"
    recurring_summary = ", ".join(
        f"{bill['merchant']}: INR {float(bill['amount']):,.2f}/month"
        for bill in overview["recurring_bills"]
    ) or "No recurring bills confirmed"
    margin_summary = (
        f"INR {overview['forecast_margin']:,.2f}"
        if overview["forecast_margin"] is not None
        else "Unavailable until the user enters monthly income"
    )

    return (
        f"Dashboard data as of {date.today().isoformat()}:\n"
        f"Current-month spend: INR {month_total:,.2f} across {len(month_expenses)} transactions.\n"
        f"Current-month spending by category: {category_summary}.\n"
        f"Monthly spend trend (up to 6 months, matching the dashboard): {monthly_summary}.\n"
        f"All-time tracked expense total: INR {all_time_total:,.2f} across {len(expenses)} transactions.\n"
        f"Month-end spend forecast (pace estimate plus confirmed recurring bills): INR {overview['forecast_spend']:,.2f}.\n"
        f"Projected month-end margin against user-entered monthly income: {margin_summary}.\n"
        f"Category budget status: {budget_summary}.\n"
        f"Confirmed recurring expenses: {recurring_summary}.\n"
        f"10 most recent transactions (maximum):\n{recent_expenses}"
    )


@router.post("")
async def chat(req: ChatRequest, user=Depends(get_current_user)):
    try:
        api_key = settings.GEMINI_API_KEY
        contents = []
        for m in req.messages:
            role = "user" if m.role == "user" else "model"
            contents.append({"role": role, "parts": [{"text": m.content}]})

        context = dashboard_context(user.id)
        system_instruction = f"{SYSTEM_PROMPT}\n\nPrivate dashboard context for this user:\n{context}"

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}",
                headers={"Content-Type": "application/json"},
                json={
                    "system_instruction": {"parts": [{"text": system_instruction}]},
                    "contents": contents,
                },
            )

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="The AI advisor service returned an error.")

        data = response.json()
        reply = data["candidates"][0]["content"]["parts"][0]["text"]
        return {"reply": reply}

    except HTTPException:
        raise
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Could not connect to the AI advisor service.")
    except Exception:
        raise HTTPException(status_code=500, detail="Could not prepare a response from your dashboard data.")