import unittest

from app.models.expense import ExpenseUpdate


class ExpenseUpdateTests(unittest.TestCase):
    def test_expense_update_allows_category_changes(self):
        payload = ExpenseUpdate(category="Travel")
        self.assertEqual(payload.category, "Travel")

    def test_expense_update_keeps_optional_fields_nullable(self):
        payload = ExpenseUpdate()
        self.assertIsNone(payload.category)
        self.assertIsNone(payload.description)


if __name__ == "__main__":
    unittest.main()
