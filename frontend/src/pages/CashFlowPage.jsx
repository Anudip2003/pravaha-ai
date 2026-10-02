import { useEffect, useState } from "react";
import { AlertTriangle, Check, RefreshCw, Save, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { apiGetFinanceOverview, apiUpdateFinanceSettings } from "../api/client";
import { DEFAULT_CATEGORIES, getAllCategories, addCustomCategory, removeCustomCategory } from "../api/classifier";

const ACCENT = "#C9A24B";

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function toDraft(settings) {
  return {
    monthly_income: String(settings.monthly_income || ""),
    category_budgets: Object.fromEntries(
      Object.entries(settings.category_budgets || {}).map(([category, amount]) => [category, String(amount)])
    ),
    recurring_expenses: settings.recurring_expenses || [],
  };
}

function toPayload(draft) {
  return {
    monthly_income: Number(draft.monthly_income) || 0,
    category_budgets: Object.fromEntries(
      Object.entries(draft.category_budgets)
        .map(([category, amount]) => [category, Number(amount)])
        .filter(([, amount]) => Number.isFinite(amount) && amount > 0)
    ),
    recurring_expenses: draft.recurring_expenses,
  };
}

function SummaryValue({ label, value, note, warning }) {
  return (
    <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
      <p className="text-white/40 text-xs mb-2">{label}</p>
      <p className={`text-2xl font-serif ${warning ? "text-amber-300" : "text-white"}`}>{value}</p>
      {note && <p className="text-white/35 text-xs mt-1">{note}</p>}
    </div>
  );
}

export default function CashFlowPage() {
  const [overview, setOverview] = useState(null);
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState(() => getAllCategories());
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function refreshCategories() {
    setCategories(getAllCategories());
  }

  function addCategory() {
    const category = addCustomCategory(newCategoryName);
    if (!category) {
      setError("Category must be unique and not blank.");
      return;
    }
    setNewCategoryName("");
    setError("");
    refreshCategories();
  }

  function removeCategory(categoryName) {
    if (DEFAULT_CATEGORIES.includes(categoryName)) return;
    if (!removeCustomCategory(categoryName)) return;

    setSettings(current => {
      if (!current) return current;
      const nextBudgets = { ...current.category_budgets };
      delete nextBudgets[categoryName];
      return {
        ...current,
        category_budgets: nextBudgets,
        recurring_expenses: (current.recurring_expenses || []).filter(bill => bill.category !== categoryName),
      };
    });
    refreshCategories();
  }

  async function loadOverview() {
    setLoading(true);
    setError("");
    try {
      const data = await apiGetFinanceOverview();
      setOverview(data);
      setSettings(toDraft(data.settings));
    } catch (loadError) {
      setError(loadError.message || "Could not load your cash-flow data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  async function saveSettings(nextSettings, successMessage = "Cash-flow settings saved.") {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await apiUpdateFinanceSettings(toPayload(nextSettings));
      const data = await apiGetFinanceOverview();
      setOverview(data);
      setSettings(toDraft(saved));
      setMessage(successMessage);
    } catch (saveError) {
      setError(saveError.message || "Could not save your cash-flow settings.");
    } finally {
      setSaving(false);
    }
  }

  function updateBudget(category, value) {
    setSettings(current => ({
      ...current,
      category_budgets: { ...current.category_budgets, [category]: value },
    }));
  }

  function confirmRecurring(candidate) {
    if (settings.recurring_expenses.some(bill => bill.key === candidate.key)) return;
    const nextSettings = {
      ...settings,
      recurring_expenses: [...settings.recurring_expenses, {
        key: candidate.key,
        merchant: candidate.merchant,
        category: candidate.category,
        amount: candidate.amount,
        day_of_month: candidate.day_of_month,
      }],
    };
    saveSettings(nextSettings, `${candidate.merchant} added as a recurring expense.`);
  }

  function removeRecurring(key) {
    const nextSettings = {
      ...settings,
      recurring_expenses: settings.recurring_expenses.filter(bill => bill.key !== key),
    };
    saveSettings(nextSettings, "Recurring expense removed.");
  }

  const budgetByCategory = Object.fromEntries((overview?.budgets || []).map(budget => [budget.category, budget]));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif text-white mb-1">Cash Flow</h1>
          <p className="text-white/40 text-sm">Monthly spending guardrails and a pace-based forecast.</p>
        </div>
        <button
          type="button"
          onClick={loadOverview}
          disabled={loading || saving}
          title="Refresh cash-flow data"
          className="p-2 text-white/45 hover:text-white/80 disabled:opacity-40"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      {loading && <p className="text-white/40 text-sm">Loading your cash-flow data...</p>}
      {error && (
        <div role="alert" className="border border-red-400/20 bg-red-400/5 rounded-lg p-4 text-sm text-red-200/80">
          {error}
          {error.includes("supabase_finance_settings.sql") && <p className="mt-2 text-xs text-red-200/60">After running the migration, refresh this page.</p>}
        </div>
      )}
      {message && <p role="status" className="text-emerald-300 text-sm">{message}</p>}

      {overview && settings && (
        <>
          <section aria-label="Monthly forecast" className="space-y-3">
            <div>
              <h2 className="text-white/80 text-sm font-medium">{overview.month_label} forecast</h2>
              <p className="text-white/35 text-xs mt-1">Based on this month’s variable-spend pace and recurring expenses you confirmed.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SummaryValue label="Spent so far" value={money(overview.current_spend)} note={`${overview.days_elapsed} of ${overview.days_in_month} days elapsed`} />
              <SummaryValue label="Projected month-end spend" value={money(overview.forecast_spend)} note="Estimate, not your bank balance" />
              <SummaryValue
                label="Projected margin"
                value={overview.forecast_margin === null ? "Add monthly income" : money(overview.forecast_margin)}
                note={overview.forecast_margin === null ? "Enter income below to calculate" : "Income entered minus projected spend"}
                warning={overview.forecast_margin !== null && overview.forecast_margin < 0}
              />
            </div>
          </section>

          <section className="border border-white/10 rounded-lg p-5 bg-white/[0.02] space-y-4">
            <div>
              <h2 className="text-white/80 text-sm font-medium">Income and category limits</h2>
              <p className="text-white/35 text-xs mt-1">These settings are saved to your account and used for the month-end estimate.</p>
            </div>
            <label className="block max-w-sm">
              <span className="text-xs text-white/50">Monthly take-home income (₹)</span>
              <input
                type="number"
                min="0"
                step="500"
                value={settings.monthly_income}
                onChange={event => setSettings(current => ({ ...current, monthly_income: event.target.value }))}
                placeholder="e.g. 50000"
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/25 outline-none focus:border-[#C9A24B] text-sm"
              />
            </label>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 gap-2 max-w-md">
                <input
                  value={newCategoryName}
                  onChange={event => setNewCategoryName(event.target.value)}
                  placeholder="Add custom category"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/25 outline-none focus:border-[#C9A24B] text-sm"
                />
                <button
                  type="button"
                  onClick={addCategory}
                  className="rounded-lg px-3 py-2 text-sm font-medium"
                  style={{ background: ACCENT, color: "#0E1525" }}
                >
                  Add
                </button>
              </div>
              {categories.filter(category => !DEFAULT_CATEGORIES.includes(category)).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {categories.filter(category => !DEFAULT_CATEGORIES.includes(category)).map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => removeCategory(category)}
                      className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/70 hover:border-red-400/40 hover:text-red-300"
                    >
                      {category}
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-xs">
                <thead className="text-white/40 border-b border-white/10">
                  <tr>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 px-3">Monthly limit</th>
                    <th className="py-2 px-3">Spent</th>
                    <th className="py-2 px-3">Forecast</th>
                    <th className="py-2 pl-3">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {categories.map(category => {
                    const budget = budgetByCategory[category];
                    const progress = budget ? Math.min(budget.percent_used, 100) : 0;
                    return (
                      <tr key={category}>
                        <td className="py-2.5 pr-3 text-white/70">{category}</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={settings.category_budgets[category] ?? ""}
                            onChange={event => updateBudget(category, event.target.value)}
                            placeholder="No limit"
                            aria-label={`${category} monthly limit`}
                            className="w-32 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white placeholder-white/25 outline-none focus:border-[#C9A24B]"
                          />
                        </td>
                        <td className="py-2 px-3 text-white/55">{money(budget?.spent)}</td>
                        <td className={`py-2 px-3 ${budget?.projected_over ? "text-amber-300" : "text-white/55"}`}>
                          {budget ? money(budget.forecast) : "—"}
                          {budget?.projected_over && <AlertTriangle size={12} className="inline ml-1" />}
                        </td>
                        <td className="py-2 pl-3">
                          {budget ? (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${progress}%`, background: budget.projected_over ? "#E8A84A" : ACCENT }} />
                              </div>
                              <span className="text-white/35">{Math.round(budget.percent_used)}%</span>
                            </div>
                          ) : <span className="text-white/25">Set a limit</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => saveSettings(settings)}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ background: ACCENT, color: "#0E1525" }}
              >
                <Save size={15} />{saving ? "Saving..." : "Save guardrails"}
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="border border-white/10 rounded-lg p-5 bg-white/[0.02] space-y-4">
              <div>
                <h2 className="text-white/80 text-sm font-medium">Possible recurring expenses</h2>
                <p className="text-white/35 text-xs mt-1">Detected from similar charges about a month apart. Confirm only the bills that recur.</p>
              </div>
              {overview.recurring_candidates.length === 0 ? (
                <p className="text-white/35 text-sm">No unconfirmed monthly patterns found yet.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {overview.recurring_candidates.map(candidate => (
                    <div key={candidate.key} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white/75">{candidate.merchant}</p>
                        <p className="text-xs text-white/35">{candidate.category} · {candidate.occurrences} charges · around day {candidate.day_of_month}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm text-white/65">{money(candidate.amount)}</span>
                        <button
                          type="button"
                          onClick={() => confirmRecurring(candidate)}
                          disabled={saving}
                          aria-label={`Confirm ${candidate.merchant} as recurring`}
                          title="Confirm recurring expense"
                          className="p-2 text-emerald-300 hover:bg-emerald-300/10 rounded disabled:opacity-40"
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-white/10 rounded-lg p-5 bg-white/[0.02] space-y-4">
              <div>
                <h2 className="text-white/80 text-sm font-medium">Confirmed monthly bills</h2>
                <p className="text-white/35 text-xs mt-1">Included in the month-end forecast until you remove them.</p>
              </div>
              {overview.recurring_bills.length === 0 ? (
                <p className="text-white/35 text-sm">Confirm a suggested pattern to include it in your forecast.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {overview.recurring_bills.map(bill => (
                    <div key={bill.key} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white/75">{bill.merchant}</p>
                        <p className="text-xs text-white/35">{bill.category} · monthly, around day {bill.day_of_month}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm text-white/65">{money(bill.amount)}</span>
                        <button
                          type="button"
                          onClick={() => removeRecurring(bill.key)}
                          disabled={saving}
                          aria-label={`Remove ${bill.merchant} recurring expense`}
                          title="Remove recurring expense"
                          className="p-2 text-white/35 hover:text-red-300 hover:bg-red-300/10 rounded disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <p className="flex items-start gap-2 text-xs text-white/30">
            {overview.forecast_margin !== null && overview.forecast_margin < 0
              ? <TrendingDown size={14} className="mt-0.5 shrink-0 text-amber-300" />
              : <TrendingUp size={14} className="mt-0.5 shrink-0" />}
            Forecast is an estimate from recorded expenses and confirmed recurring bills. It is not a live bank balance and does not include unrecorded income or transactions.
          </p>
        </>
      )}
    </div>
  );
}