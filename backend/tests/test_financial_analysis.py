import unittest
from datetime import date

from app.core.financial_analysis import build_financial_overview, detect_recurring_expenses


class FinancialAnalysisTests(unittest.TestCase):
    def test_detects_monthly_charge_with_stable_amount(self):
        expenses = [
            {"description": "NETFLIX monthly plan", "amount": 499, "category": "Entertainment", "txn_date": "2026-07-10"},
            {"description": "Netflix subscription", "amount": 501, "category": "Entertainment", "txn_date": "2026-08-10"},
        ]

        candidates = detect_recurring_expenses(expenses)

        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["key"], "netflix")
        self.assertEqual(candidates[0]["amount"], 500)

    def test_ignores_uneven_or_materially_different_charges(self):
        expenses = [
            {"description": "Cafe payment", "amount": 400, "category": "Food & Dining", "txn_date": "2026-07-01"},
            {"description": "Cafe payment", "amount": 900, "category": "Food & Dining", "txn_date": "2026-08-01"},
            {"description": "Taxi fare", "amount": 300, "category": "Transport", "txn_date": "2026-07-01"},
            {"description": "Taxi fare", "amount": 300, "category": "Transport", "txn_date": "2026-08-20"},
        ]

        self.assertEqual(detect_recurring_expenses(expenses), [])

    def test_forecast_counts_confirmed_recurring_bill_once(self):
        expenses = [
            {"description": "Netflix monthly plan", "amount": 500, "category": "Entertainment", "txn_date": "2026-08-10"},
            {"description": "Netflix monthly plan", "amount": 500, "category": "Entertainment", "txn_date": "2026-09-10"},
            {"description": "Grocery shop", "amount": 100, "category": "Groceries", "txn_date": "2026-09-01"},
            {"description": "Grocery shop", "amount": 100, "category": "Groceries", "txn_date": "2026-09-10"},
        ]
        settings = {
            "monthly_income": 5000,
            "category_budgets": {"Groceries": 150},
            "recurring_expenses": [
                {"key": "netflix", "merchant": "Netflix", "category": "Entertainment", "amount": 500, "day_of_month": 10},
            ],
        }

        overview = build_financial_overview(expenses, settings, today=date(2026, 9, 15))

        self.assertEqual(overview["current_spend"], 700)
        self.assertEqual(overview["forecast_spend"], 900)
        self.assertEqual(overview["forecast_margin"], 4100)
        self.assertTrue(overview["budgets"][0]["projected_over"])


if __name__ == "__main__":
    unittest.main()