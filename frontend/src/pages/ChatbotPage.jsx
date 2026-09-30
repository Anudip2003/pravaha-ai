// src/pages/ChatbotPage.jsx
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { apiChat } from "../api/client";

const ACCENT = "#C9A24B";

export default function ChatbotPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your Pravaha finance advisor. Ask me anything about budgeting, investing, saving, or managing money in India. What's on your mind?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const data = await apiChat(newMessages.map(m => ({ role: m.role, content: m.content })));
      const reply = data.reply || "Sorry, I couldn't get a response.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: err.message || "Something went wrong. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-serif text-white mb-1">AI Finance Advisor</h1>
        <p className="text-white/40 text-sm">Ask about your tracked spending, budgeting, or investing.</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-white/10"
              style={{ background: msg.role === "assistant" ? "rgba(201,162,75,0.15)" : "rgba(255,255,255,0.05)" }}>
              {msg.role === "assistant"
                ? <Bot size={15} style={{ color: ACCENT }} />
                : <User size={15} className="text-white/60" />}
            </div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-white/10 text-white rounded-tr-sm"
                : "bg-white/[0.04] text-white/80 rounded-tl-sm border border-white/10"
            }`}>
              {msg.content.split("\n").map((line, j) => (
                <span key={j}>{line}{j < msg.content.split("\n").length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-white/10"
              style={{ background: "rgba(201,162,75,0.15)" }}>
              <Bot size={15} style={{ color: ACCENT }} />
            </div>
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            "Summarize my spending this month",
            "Which categories are costing me the most?",
            "How should I start investing with ₹10,000/month?",
            "Explain SIP vs lump sum investing",
            "What is the 50/30/20 budgeting rule?",
            "How much should I keep in emergency fund?",
          ].map(q => (
            <button key={q} onClick={() => { setInput(q); }}
              className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex gap-3 border border-white/10 rounded-xl p-3 bg-white/[0.02]">
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Ask about investing, budgeting, saving..."
          rows={1}
          className="flex-1 bg-transparent text-white placeholder-white/25 outline-none resize-none text-sm leading-relaxed" />
        <button onClick={sendMessage} disabled={!input.trim() || loading}
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center disabled:opacity-40 transition-all hover:scale-105"
          style={{ background: ACCENT }}>
          <Send size={15} style={{ color: "#0E1525" }} />
        </button>
      </div>
      <p className="text-white/20 text-xs mt-2 text-center">Educational guidance only — not licensed financial advice</p>
    </div>
  );
}
