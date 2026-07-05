// src/pages/InvestmentPage.jsx
import { useState } from "react";
import { TrendingUp, Info } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const ACCENT = "#C9A24B";
const COLORS = ["#4B8EC9", "#C9A24B", "#4BC975", "#9B4BC9", "#C94B4B"];

const RISK_PROFILES = {
  conservative: {
    label: "Conservative",
    desc: "Capital preservation over growth. Prefer stability.",
    allocation: { "Debt Mutual Funds": 50, "Gold / SGB": 20, "Equity Mutual Funds": 20, "Emergency Fund": 10 },
  },
  moderate: {
    label: "Moderate",
    desc: "Balanced growth with managed risk.",
    allocation: { "Equity Mutual Funds": 50, "Debt Mutual Funds": 25, "Gold / SGB": 15, "Emergency Fund": 10 },
  },
  aggressive: {
    label: "Aggressive",
    desc: "High growth focus, comfortable with market volatility.",
    allocation: { "Equity Mutual Funds": 70, "Direct Stocks": 15, "Debt Mutual Funds": 10, "Emergency Fund": 5 },
  },
};

const WHERE_TO_INVEST = {
  "Equity Mutual Funds": ["Nifty 50 Index Fund (Zerodha Coin, Groww)", "Parag Parikh Flexi Cap Fund", "Mirae Asset Large Cap Fund"],
  "Debt Mutual Funds": ["HDFC Short Term Debt Fund", "ICICI Prudential Corporate Bond Fund"],
  "Gold / SGB": ["Sovereign Gold Bonds (via RBI/Zerodha)", "Gold ETF on NSE"],
  "Direct Stocks": ["Start with Nifty 50 constituents via Zerodha/Groww"],
  "Emergency Fund": ["High-yield savings account", "Liquid mutual fund (instant withdrawal)"],
};

function AllocationBar({ label, percent, color, amount }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-white/70">{label}</span>
        <span style={{ color: ACCENT }}>₹{Number(amount).toLocaleString("en-IN")} ({percent}%)</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  );
}

export default function InvestmentPage() {
  const [salary, setSalary] = useState("");
  const [expenses, setExpenses] = useState("");
  const [age, setAge] = useState("");
  const [risk, setRisk] = useState("moderate");
  const [result, setResult] = useState(null);

  function calculate() {
    const surplus = parseFloat(salary) - parseFloat(expenses);
    if (surplus <= 0) { alert("Your expenses exceed your salary. Reduce expenses first!"); return; }

    // Emergency fund check: 6 months of expenses
    const emergencyTarget = parseFloat(expenses) * 6;

    const profile = RISK_PROFILES[risk];
    const breakdown = Object.entries(profile.allocation).map(([name, pct], i) => ({
      name,
      percent: pct,
      amount: Math.round((surplus * pct) / 100),
      color: COLORS[i % COLORS.length],
      suggestions: WHERE_TO_INVEST[name] || [],
    }));

    // Age-based equity note (100 - age rule)
    const equityIdeal = 100 - parseInt(age);

    setResult({ surplus, breakdown, equityIdeal, emergencyTarget, profile });
  }

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/25 outline-none focus:border-[#C9A24B] transition-colors text-sm";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif text-white mb-1">Investment Planner</h1>
        <p className="text-white/40 text-sm">AI-guided allocation based on your salary, expenses, and risk profile.</p>
      </div>

      {/* Input form */}
      <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02] space-y-4">
        <p className="text-white/70 text-sm font-medium">Tell us about your finances</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Monthly salary / income (₹)</label>
            <input type="number" value={salary} onChange={e => setSalary(e.target.value)}
              placeholder="e.g. 50000" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Monthly expenses (₹)</label>
            <input type="number" value={expenses} onChange={e => setExpenses(e.target.value)}
              placeholder="e.g. 30000" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Your age</label>
            <input type="number" value={age} onChange={e => setAge(e.target.value)}
              placeholder="e.g. 23" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Risk appetite</label>
            <select value={risk} onChange={e => setRisk(e.target.value)}
              className={inputCls + " cursor-pointer"} style={{ background: "#0E1525" }}>
              {Object.entries(RISK_PROFILES).map(([key, val]) => (
                <option key={key} value={key}>{val.label} — {val.desc}</option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={calculate} disabled={!salary || !expenses || !age}
          className="w-full rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.01]"
          style={{ background: ACCENT, color: "#0E1525" }}>
          <TrendingUp size={15} /> Generate My Investment Plan
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Surplus summary */}
          <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-white/40 text-xs mb-1">Monthly Surplus</p>
                <p className="text-2xl font-serif" style={{ color: ACCENT }}>₹{result.surplus.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs mb-1">Risk Profile</p>
                <p className="text-2xl font-serif text-white">{result.profile.label}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs mb-1">Ideal Equity % (age rule)</p>
                <p className="text-2xl font-serif text-white">{result.equityIdeal}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Allocation bars */}
            <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
              <p className="text-white/70 text-sm font-medium mb-4">Monthly Allocation Breakdown</p>
              {result.breakdown.map(item => (
                <AllocationBar key={item.name} label={item.name}
                  percent={item.percent} amount={item.amount} color={item.color} />
              ))}
            </div>

            {/* Pie chart */}
            <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
              <p className="text-white/70 text-sm font-medium mb-3">Visual Split</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={result.breakdown} cx="50%" cy="50%" outerRadius={75} dataKey="amount">
                    {result.breakdown.map((item, i) => <Cell key={i} fill={item.color} />)}
                  </Pie>
                  <Tooltip formatter={v => `₹${Number(v).toLocaleString("en-IN")}`}
                    contentStyle={{ background: "#0E1525", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white" }} />
                  <Legend formatter={v => <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Where to invest suggestions */}
          <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
            <p className="text-white/70 text-sm font-medium mb-4">Where to Invest — Specific Suggestions</p>
            <div className="grid grid-cols-2 gap-4">
              {result.breakdown.map(item => (
                <div key={item.name} className="space-y-1">
                  <p className="text-xs font-medium" style={{ color: item.color }}>{item.name}</p>
                  {item.suggestions.map((s, i) => (
                    <p key={i} className="text-white/50 text-xs">· {s}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Emergency fund note */}
          <div className="border border-yellow-500/20 rounded-xl p-4 bg-yellow-500/5 flex gap-3">
            <Info size={16} className="text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-yellow-200/70 text-xs leading-relaxed">
              Your 6-month emergency fund target is <strong className="text-yellow-300">₹{result.emergencyTarget.toLocaleString("en-IN")}</strong>. 
              Build this first in a liquid fund or savings account before investing aggressively. 
              This is educational guidance, not licensed financial advice.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
