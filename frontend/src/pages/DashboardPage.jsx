// src/pages/DashboardPage.jsx
import { useState, useEffect, useCallback } from "react";
import { PlusCircle, Trash2, TrendingDown, Wallet, Tag } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { apiGetExpenses, apiAddExpense, apiDeleteExpense } from "../api/client";
import { classifyExpense, ALL_CATEGORIES } from "../api/classifier";
import StatementImport from "../components/StatementImport";

const ACCENT = "#C9A24B";
const COLORS = ["#C9A24B","#4B8EC9","#4BC975","#C94B7A","#9B4BC9","#C9784B","#4BC9C2","#C9C24B","#4B54C9","#8DC94B","#C94B4B"];

function StatCard({ label, value, sub }) {
  return (
    <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
      <p className="text-white/40 text-xs mb-2">{label}</p>
      <p className="text-3xl font-serif" style={{ color: ACCENT }}>₹{Number(value).toLocaleString("en-IN")}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function AddExpenseForm({ onAdd }) {
  const today = new Date().toISOString().split("T")[0];
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState("");
  const [autoCategory, setAutoCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleDescChange(e) {
    setDesc(e.target.value);
    const auto = classifyExpense(e.target.value);
    setAutoCategory(auto);
    if (!category) setCategory(auto);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!desc || !amount || !date) return;
    setLoading(true);
    setError("");
    try {
      const expense = await apiAddExpense(parseFloat(amount), desc, date, category || autoCategory);
      onAdd(expense);
      setDesc(""); setAmount(""); setDate(today); setCategory(""); setAutoCategory("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/25 outline-none focus:border-[#C9A24B] transition-colors text-sm";

  return (
    <form onSubmit={handleSubmit} className="border border-white/10 rounded-xl p-5 bg-white/[0.02] space-y-3">
      <p className="text-white/70 text-sm font-medium mb-1">Add Expense</p>

      <input value={desc} onChange={handleDescChange} placeholder="Description (e.g. Swiggy order)" className={inputCls} />

      {autoCategory && (
        <div className="flex items-center gap-1.5 text-xs" style={{ color: ACCENT }}>
          <Tag size={12} /> Auto-detected: <strong>{autoCategory}</strong>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
          placeholder="Amount (₹)" className={inputCls} min="1" step="0.01" />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
      </div>

      <select value={category} onChange={e => setCategory(e.target.value)}
        className={inputCls + " cursor-pointer"} style={{ background: "#0E1525" }}>
        <option value="">Override category (optional)</option>
        {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button type="submit" disabled={loading || !desc || !amount}
        className="w-full rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.01]"
        style={{ background: ACCENT, color: "#0E1525" }}>
        <PlusCircle size={15} />
        {loading ? "Adding..." : "Add Expense"}
      </button>
    </form>
  );
}

export default function DashboardPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const fetchExpenses = useCallback(async () => {
    try {
      const data = await apiGetExpenses();
      setExpenses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  function handleAdd(newExpense) {
    setExpenses(prev => [newExpense, ...prev]);
  }

  function handleImport(importedExpenses) {
    setExpenses(prev => [...importedExpenses, ...prev].sort((a, b) => b.txn_date.localeCompare(a.txn_date)));
  }

  async function handleDelete(id) {
    try {
      await apiDeleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (e) { console.error(e); }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const monthOptions = [...new Set([currentMonth, ...expenses.map(e => e.txn_date?.slice(0, 7)).filter(Boolean)])]
    .sort()
    .reverse();
  const monthExpenses = expenses.filter(e => e.txn_date?.startsWith(selectedMonth));
  const totalSelectedMonth = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalAll = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const selectedMonthLabel = new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  // Category breakdown for pie chart
  const categoryMap = {};
  monthExpenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + Number(e.amount);
  });
  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  // Monthly bar chart
  const monthMap = {};
  expenses.forEach(e => {
    const m = e.txn_date?.slice(0, 7);
    if (m) monthMap[m] = (monthMap[m] || 0) + Number(e.amount);
  });
  const barData = Object.entries(monthMap).sort().slice(-6).map(([month, amount]) => ({
    month: new Date(month + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
    amount
  }));

  const topCategory = pieData.sort((a, b) => b.value - a.value)[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-white mb-1">Dashboard</h1>
          <p className="text-white/40 text-sm">Your spending overview for {selectedMonthLabel}.</p>
        </div>
        <label className="flex items-center gap-2 text-white/40 text-xs">
          View month
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C9A24B]"
            style={{ background: "#0E1525" }}
          >
            {monthOptions.map(month => (
              <option key={month} value={month}>
                {new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label={`${selectedMonthLabel} spend`} value={totalSelectedMonth} sub={`${monthExpenses.length} transactions`} />
        <StatCard label="Top category" value={topCategory?.value || 0} sub={topCategory?.name || "No data yet"} />
        <StatCard label="Total tracked" value={totalAll} sub={`${expenses.length} total transactions`} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Add expense form */}
        <AddExpenseForm onAdd={handleAdd} />

        {/* Category pie chart */}
        <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
          <p className="text-white/70 text-sm font-medium mb-3">{selectedMonthLabel} Spend by Category</p>
          {pieData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-white/20 text-sm">Add expenses to see breakdown</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `₹${Number(v).toLocaleString("en-IN")}`} contentStyle={{ background: "#0E1525", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <StatementImport expenses={expenses} onImported={handleImport} isLoading={loading} />

      {/* Monthly bar chart */}
      {barData.length > 0 && (
        <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
          <p className="text-white/70 text-sm font-medium mb-3">Monthly Spend Trend</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData}>
              <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => `₹${Number(v).toLocaleString("en-IN")}`} contentStyle={{ background: "#0E1525", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white" }} />
              <Bar dataKey="amount" fill={ACCENT} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expense list */}
      <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
        <p className="text-white/70 text-sm font-medium mb-3">{selectedMonthLabel} Transactions</p>
        {loading ? (
          <p className="text-white/30 text-sm">Loading...</p>
        ) : expenses.length === 0 ? (
          <p className="text-white/30 text-sm">No expenses yet. Add your first one above!</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {expenses.map((e, i) => (
              <div key={e.id || i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{e.description}</p>
                  <p className="text-white/30 text-xs">{e.txn_date} · {e.category}</p>
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <span className="font-medium text-sm" style={{ color: ACCENT }}>₹{Number(e.amount).toLocaleString("en-IN")}</span>
                  <button onClick={() => handleDelete(e.id)} className="text-white/20 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
