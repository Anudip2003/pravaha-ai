from calendar import monthrange
from collections import defaultdict
from datetime import date
import re
from statistics import median


_MERCHANT_NOISE = {
    "autopay", "card", "com", "debit", "mandate", "monthly", "online",
    "payment", "plan", "pos", "purchase", "recurring", "subscription",
    "transaction", "upi", "www",
}


def normalize_merchant(description: str) -> str:
    value = description.lower()
    value = re.sub(r"\b(?:ref|rrn|txn|utr|trace|auth)[\s:#/-]*[a-z0-9-]{5,}\b", " ", value)
    value = re.sub(r"\b(?:neft|imps|rtgs)\b", " ", value)
    tokens = re.findall(r"[a-z]{3,}", value)
    return " ".join(token for token in tokens if token not in _MERCHANT_NOISE)


def _transaction_date(value):
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def _amount(expense):
    try:
        return max(float(expense.get("amount") or 0), 0)
    except (TypeError, ValueError):
        return 0.0


def detect_recurring_expenses(expenses, confirmed_keys=()):
    groups = defaultdict(list)
    for expense in expenses:
        txn_date = _transaction_date(expense.get("txn_date"))
        amount = _amount(expense)
        key = normalize_merchant(str(expense.get("description") or ""))
        if txn_date and amount > 0 and key:
            groups[key].append((txn_date, amount, expense.get("category") or "Other"))

    confirmed = set(confirmed_keys)
    candidates = []
    for key, transactions in groups.items():
        if key in confirmed or len(transactions) < 2:
            continue
        transactions.sort(key=lambda transaction: transaction[0])
        matching_pairs = []
        for previous, current in zip(transactions, transactions[1:]):
            interval = (current[0] - previous[0]).days
            larger_amount = max(previous[1], current[1])
            similar_amount = abs(previous[1] - current[1]) <= larger_amount * 0.2
            if 25 <= interval <= 35 and similar_amount:
                matching_pairs.append((previous, current, interval))

        if not matching_pairs:
            continue

        recent_pairs = matching_pairs[-3:]
        pair_amounts = [amount for previous, current, _ in recent_pairs for amount in (previous[1], current[1])]
        latest = recent_pairs[-1][1]
        candidates.append({
            "key": key,
            "merchant": key.title(),
            "category": latest[2],
            "amount": round(median(pair_amounts), 2),
            "day_of_month": latest[0].day,
            "occurrences": len(transactions),
            "last_date": latest[0].isoformat(),
        })

    return sorted(candidates, key=lambda candidate: candidate["merchant"].lower())


def build_financial_overview(expenses, settings=None, today=None):
    today = today or date.today()
    settings = settings or {}
    month_key = today.strftime("%Y-%m")
    days_in_month = monthrange(today.year, today.month)[1]
    days_elapsed = max(today.day, 1)

    month_expenses = [
        expense for expense in expenses
        if str(expense.get("txn_date", ""))[:7] == month_key
    ]
    current_category_spend = defaultdict(float)
    variable_category_spend = defaultdict(float)
    confirmed_bills = settings.get("recurring_expenses") or []
    confirmed_by_key = {
        bill.get("key"): bill
        for bill in confirmed_bills
        if bill.get("key") and _amount(bill) > 0
    }

    current_spend = 0.0
    variable_spend = 0.0
    for expense in month_expenses:
        amount = _amount(expense)
        category = expense.get("category") or "Other"
        current_spend += amount
        current_category_spend[category] += amount
        merchant_key = normalize_merchant(str(expense.get("description") or ""))
        if merchant_key not in confirmed_by_key:
            variable_spend += amount
            variable_category_spend[category] += amount

    forecast_categories = {
        category: amount / days_elapsed * days_in_month
        for category, amount in variable_category_spend.items()
    }
    for bill in confirmed_by_key.values():
        category = bill.get("category") or "Other"
        forecast_categories[category] = forecast_categories.get(category, 0) + _amount(bill)

    forecast_spend = sum(forecast_categories.values())
    budgets = settings.get("category_budgets") or {}
    budget_status = []
    for category, limit in sorted(budgets.items()):
        try:
            limit = float(limit)
        except (TypeError, ValueError):
            continue
        if limit <= 0:
            continue
        forecast = forecast_categories.get(category, 0.0)
        budget_status.append({
            "category": category,
            "limit": round(limit, 2),
            "spent": round(current_category_spend.get(category, 0.0), 2),
            "forecast": round(forecast, 2),
            "percent_used": round(current_category_spend.get(category, 0.0) / limit * 100, 1),
            "projected_over": forecast > limit,
        })

    try:
        monthly_income = max(float(settings.get("monthly_income") or 0), 0)
    except (TypeError, ValueError):
        monthly_income = 0.0

    confirmed_keys = confirmed_by_key.keys()
    return {
        "month": month_key,
        "month_label": today.strftime("%B %Y"),
        "days_elapsed": days_elapsed,
        "days_in_month": days_in_month,
        "current_spend": round(current_spend, 2),
        "forecast_spend": round(forecast_spend, 2),
        "monthly_income": round(monthly_income, 2),
        "forecast_margin": round(monthly_income - forecast_spend, 2) if monthly_income > 0 else None,
        "category_spend": {category: round(amount, 2) for category, amount in current_category_spend.items()},
        "category_forecast": {category: round(amount, 2) for category, amount in forecast_categories.items()},
        "budgets": budget_status,
        "recurring_bills": list(confirmed_by_key.values()),
        "recurring_candidates": detect_recurring_expenses(expenses, confirmed_keys),
    }