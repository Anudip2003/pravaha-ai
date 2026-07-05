// src/App.jsx
import { useState } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import InvestmentPage from "./pages/InvestmentPage";
import ChatbotPage from "./pages/ChatbotPage";
import Sidebar from "./components/Sidebar";

function AppShell() {
  const { user, loading } = useAuth();
  const [active, setActive] = useState("dashboard");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0E1525" }}>
        <div className="w-6 h-6 border-2 border-white/20 border-t-[#C9A24B] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <div className="min-h-screen flex" style={{ background: "#0B0F1A" }}>
      <Sidebar active={active} setActive={setActive} />
      <main className="flex-1 p-8 overflow-y-auto">
        {active === "dashboard"  && <DashboardPage />}
        {active === "investment" && <InvestmentPage />}
        {active === "chatbot"    && <ChatbotPage />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
