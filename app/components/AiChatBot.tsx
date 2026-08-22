"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Sparkles, User, AlertCircle, RefreshCw, Activity, Trash2, ChevronDown, ChevronUp, Cpu, HeartPulse } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  engine?: string;
};

type Props = {
  patient: any;
  userRole: "doctor" | "family" | "patient" | "assistant";
};

export default function AiChatBot({ patient, userRole }: Props) {
  const [open, setOpen] = useState(false);
  const [showVitals, setShowVitals] = useState(false);
  const [activeEngine, setActiveEngine] = useState("Yorisoi AI Engine");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      text: userRole === "patient"
        ? `Hello! I am your Yorisoi AI care assistant. I can help explain your health status, medication schedule, or daily safety tips in plain English.`
        : userRole === "family"
        ? `Hello! I am Yorisoi AI. Ask me anything about ${patient?.name || "your family member"}'s latest vital signs, care updates, or safety guidelines.`
        : userRole === "assistant"
        ? `Yorisoi AI Assistant online for Compounder / Assistant workflow. Ask me about appointment scheduling status, patient follow-up guidelines, or doctor instructions.`
        : `Yorisoi AI Assistant online. Ready for clinical queries, vital trend analysis, or care plan drafting for ${patient?.name || "the selected patient"}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      engine: "Yorisoi AI Engine"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Quick suggestion chips based on role
  const quickPrompts = userRole === "patient" ? [
    "🩺 Explain my health vitals",
    "💊 My medication routine",
    "🚨 Daily safety & SOS tips"
  ] : userRole === "family" ? [
    "❤️ How is my relative today?",
    "💊 Medication adherence status",
    "📞 Emergency care contact"
  ] : userRole === "assistant" ? [
    "📅 Appointments status summary",
    "🕒 Follow-up guidelines",
    "📋 Patient ID search help"
  ] : [
    "📈 Analyze vital trends",
    "📝 Suggest care plan updates",
    "🛡️ Fall & risk evaluation"
  ];

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  async function sendMessage(textToSend: string) {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      role: "user",
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend.trim(),
          patient: patient ? {
            id: patient.id,
            name: patient.name,
            age: patient.age,
            riskLevel: patient.riskLevel,
            risk: patient.risk,
            spo2: patient.spo2,
            systolic: patient.systolic,
            adherence: patient.adherence,
            falls: patient.falls,
            conditions: patient.conditions,
            medications: patient.medications,
            living: patient.living
          } : null,
          userRole
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chat service unavailable.");

      const engineName = data.engine || "Yorisoi AI Engine";
      setActiveEngine(engineName);

      const aiMsg: Message = {
        id: String(Date.now() + 1),
        role: "assistant",
        text: data.reply || data.response || "No response received.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        engine: engineName
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      const errorMsg: Message = {
        id: String(Date.now() + 1),
        role: "assistant",
        text: e instanceof Error ? e.message : "I am experiencing temporary connection issues. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function clearHistory() {
    setMessages([
      {
        id: String(Date.now()),
        role: "assistant",
        text: "Chat reset. How else can I assist you?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        engine: activeEngine
      }
    ]);
  }

  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "linear-gradient(135deg, #1c4949 0%, #2a6262 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "30px",
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(28, 73, 73, 0.3)",
            cursor: "pointer",
            transition: "transform 0.2s ease, box-shadow 0.2s ease"
          }}
          suppressHydrationWarning
        >
          <Bot size={20} style={{ color: "#7fe3c5" }} />
          <span>Yorisoi AI Chat</span>
          <span style={{ background: "#7fe3c5", color: "#1c4949", fontSize: "10px", padding: "2px 6px", borderRadius: "10px", fontWeight: 700 }}>
            LIVE
          </span>
        </button>
      ) : (
        <div
          style={{
            width: "390px",
            height: "540px",
            background: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            border: "1px solid #dce8e2",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
          suppressHydrationWarning
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #1c4949 0%, #2a6262 100%)",
              color: "#ffffff",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ background: "rgba(255,255,255,0.15)", padding: "6px", borderRadius: "10px" }}>
                <Bot size={18} style={{ color: "#7fe3c5" }} />
              </div>
              <div>
                <strong style={{ fontSize: "14px", display: "block", lineHeight: "1.2" }}>Yorisoi AI Assistant</strong>
                <small style={{ fontSize: "10px", color: "#b2e8d9", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Cpu size={10} /> {activeEngine}
                </small>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {patient && (
                <button
                  type="button"
                  onClick={() => setShowVitals(!showVitals)}
                  title="Toggle Patient Vitals overlay"
                  style={{
                    background: showVitals ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)",
                    border: "none",
                    color: "#fff",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer"
                  }}
                  suppressHydrationWarning
                >
                  <Activity size={12} /> Vitals
                </button>
              )}

              <button
                type="button"
                onClick={clearHistory}
                title="Clear Chat History"
                style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", padding: "4px" }}
                suppressHydrationWarning
              >
                <Trash2 size={15} />
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer", padding: "4px" }}
                suppressHydrationWarning
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Collapsible Mini Vitals Banner */}
          {showVitals && patient && (
            <div
              style={{
                background: "#eef6f2",
                borderBottom: "1px solid #d8e6de",
                padding: "8px 14px",
                fontSize: "11px",
                color: "#1c4949",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <span><b>{patient.name}</b> (ID: {patient.id})</span>
              <span>SpO2: <b>{patient.spo2}%</b> · BP: <b>{patient.systolic}</b> mmHg · Adherence: <b>{patient.adherence}%</b></span>
            </div>
          )}

          {/* Messages Container */}
          <div style={{ flex: 1, padding: "14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", background: "#f8faf9" }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "86%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: m.role === "user" ? "flex-end" : "flex-start"
                }}
              >
                <div
                  style={{
                    background: m.role === "user" ? "#1c4949" : "#ffffff",
                    color: m.role === "user" ? "#ffffff" : "#243c3c",
                    padding: "10px 13px",
                    borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                    fontSize: "12.5px",
                    lineHeight: "1.5",
                    border: m.role === "user" ? "none" : "1px solid #e1ebe5",
                    boxShadow: m.role === "user" ? "none" : "0 2px 6px rgba(0,0,0,0.03)"
                  }}
                >
                  {m.text}
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "3px", padding: "0 4px" }}>
                  <small style={{ fontSize: "9.5px", color: "#8fa39e" }}>{m.timestamp}</small>
                  {m.role === "assistant" && m.engine && (
                    <small style={{ fontSize: "9px", color: "#61877e", background: "#e8f2ee", padding: "1px 5px", borderRadius: "6px" }}>
                      {m.engine}
                    </small>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", background: "#ffffff", padding: "8px 12px", borderRadius: "12px", fontSize: "11.5px", color: "#546e6d", border: "1px solid #e1ebe5" }}>
                <RefreshCw size={13} className="spin" style={{ display: "inline", marginRight: "6px" }} />
                Yorisoi AI is thinking…
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Quick Action Chips (Un-crowded pill buttons) */}
          <div
            style={{
              padding: "6px 12px",
              background: "#ffffff",
              borderTop: "1px solid #edf2ee",
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              whiteSpace: "nowrap"
            }}
          >
            {quickPrompts.map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(promptText.replace(/^[^\s]+\s/, ""))}
                disabled={loading}
                style={{
                  background: "#f0f5f2",
                  border: "1px solid #d4e3dc",
                  borderRadius: "14px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  color: "#25484a",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
                suppressHydrationWarning
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleFormSubmit}
            style={{
              padding: "10px 12px",
              background: "#ffffff",
              borderTop: "1px solid #e3ebe7",
              display: "flex",
              gap: "8px"
            }}
            suppressHydrationWarning
          >
            <input
              type="text"
              placeholder={userRole === "patient" ? "Ask a health question…" : "Type clinical or care query..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #d0ded6",
                borderRadius: "8px",
                fontSize: "12.5px",
                outline: "none"
              }}
              suppressHydrationWarning
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: "#1c4949",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                opacity: loading || !input.trim() ? 0.6 : 1
              }}
              suppressHydrationWarning
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
