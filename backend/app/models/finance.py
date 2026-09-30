from pydantic import BaseModel, Field, field_validator


class RecurringExpense(BaseModel):
    key: str = Field(min_length=1, max_length=120)
    merchant: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=80)
    amount: float = Field(gt=0, le=100_000_000)
    day_of_month: int = Field(ge=1, le=31)


class FinanceSettingsUpdate(BaseModel):
    monthly_income: float = Field(default=0, ge=0, le=100_000_000)
    category_budgets: dict[str, float] = Field(default_factory=dict)
    recurring_expenses: list[RecurringExpense] = Field(default_factory=list, max_length=100)

    @field_validator("category_budgets")
    @classmethod
    def model_validate_budget_values(cls, values):
        for category, amount in values.items():
            if not category.strip() or amount <= 0 or amount > 100_000_000:
                raise ValueError("Budget categories must have a positive monthly limit.")
        return values