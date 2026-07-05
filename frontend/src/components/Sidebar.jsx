// src/components/Sidebar.jsx
import { LayoutGrid, TrendingUp, MessageCircle, LogOut, Wallet } from "lucide-react";
import { useAuth } from "../hooks/useAuth.jsx";

const ACCENT = "#C9A24B";
const INK = "#0E1525";

const NAV = [
  { id: "dashboard",  label: "Dashboard",  icon: LayoutGrid },
  { id: "investment", label: "Investment",  icon: TrendingUp },
  { id: "chatbot",    label: "AI Advisor",  icon: MessageCircle },
];

export default function Sidebar({ active, setActive }) {
  const { user, logout } = useAuth();

  return (
    <div className="w-56 shrink-0 border-r border-white/10 flex flex-col p-4" style={{ background: INK }}>
      <div className="flex items-center gap-2 px-2 py-3 mb-6 text-white">
        <Wallet size={18} style={{ color: ACCENT }} />
        <span className="font-serif text-lg">Pravaha</span>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map(it => (
          <button key={it.id} onClick={() => setActive(it.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
            style={{ background: active === it.id ? "rgba(201,162,75,0.12)" : "transparent",
                     color: active === it.id ? ACCENT : "rgba(255,255,255,0.55)" }}>
            <it.icon size={17} />
            {it.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-white/10 pt-3">
        <p className="text-white/60 text-sm px-2 mb-2 truncate">{user?.name}</p>
        <p className="text-white/30 text-xs px-2 mb-3 truncate">{user?.email}</p>
        <button onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors">
          <LogOut size={15} /> Log out
        </button>
      </div>
    </div>
  );
}
