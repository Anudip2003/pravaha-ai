// src/pages/AuthPage.jsx
import { useState } from "react";
import { useAuth } from "../hooks/useAuth.jsx";
import { Wallet, ArrowRight } from "lucide-react";

const ACCENT = "#C9A24B";
const INK = "#0E1525";

export default function AuthPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password, name);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: INK }}>
      {/* Left brand panel */}
      <div className="hidden md:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="relative z-10 flex items-center gap-2 text-white">
          <Wallet size={22} style={{ color: ACCENT }} />
          <span className="font-serif text-xl tracking-tight">Pravaha</span>
        </div>
        <div className="relative z-10">
          <p className="text-sm uppercase tracking-[0.2em] mb-4" style={{ color: ACCENT }}>Your money, explained</p>
          <h1 className="font-serif text-5xl leading-tight text-white mb-6">
            See where it<br />goes. Know where<br />it should.
          </h1>
          <p className="text-white/50 max-w-sm leading-relaxed">
            Track spending, get AI-guided investment allocation, and ask questions about your finances in plain language.
          </p>
        </div>
        <p className="relative z-10 text-white/30 text-xs">Educational guidance only — not licensed financial advice.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-2 text-white mb-10">
            <Wallet size={20} style={{ color: ACCENT }} />
            <span className="font-serif text-lg">Pravaha</span>
          </div>

          <h2 className="text-white text-2xl font-serif mb-1">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-white/40 text-sm mb-8">
            {mode === "login" ? "Log in to see your dashboard." : "Takes less than a minute."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs text-white/50 mb-1 block">Full name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Anudip"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/25 outline-none focus:border-[#C9A24B] transition-colors" />
              </div>
            )}
            <div>
              <label className="text-xs text-white/50 mb-1 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@gmail.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/25 outline-none focus:border-[#C9A24B] transition-colors" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/25 outline-none focus:border-[#C9A24B] transition-colors" />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full mt-2 rounded-lg py-2.5 font-medium flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-60"
              style={{ background: ACCENT, color: INK }}>
              {loading ? "Please wait..." : (mode === "login" ? "Log in" : "Sign up")}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="text-white/40 text-sm mt-6 text-center">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              className="text-white underline underline-offset-4 decoration-white/30 hover:decoration-white">
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
