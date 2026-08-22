"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Sparkles, User, AlertCircle, RefreshCw } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
};

type Props = {
  patient: any;
  userRole: "doctor" | "family" | "patient" | "assistant";
};

export default function AiChatBot({ patient, userRole }: Props) {
  const [open, setOpen] = useState(false);
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
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");

    const userMsg: Message = {
      id: String(Date.now()),
      role: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
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

      const aiMsg: Message = {
        id: String(Date.now() + 1),
        role: "assistant",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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
            width: "380px",
            height: "520px",
            background: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            border: "1px solid #dce8e2",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #1c4949 0%, #2a6262 100%)",
              color: "#ffffff",
              padding: "14px 18px",
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
                <small style={{ fontSize: "11px", color: "#b2e8d9" }}>
                  {userRole === "patient" ? "Patient Guide Mode" : userRole === "family" ? "Family Monitor Mode" : userRole === "assistant" ? "Assistant Workflow Mode" : "Doctor Clinical Mode"}
                </small>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer", padding: "4px" }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", background: "#f8faf9" }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: m.role === "user" ? "flex-end" : "flex-start"
                }}
              >
                <div
                  style={{
                    background: m.role === "user" ? "#1c4949" : "#ffffff",
                    color: m.role === "user" ? "#ffffff" : "#243c3c",
                    padding: "10px 14px",
                    borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    border: m.role === "user" ? "none" : "1px solid #e1ebe5",
                    boxShadow: m.role === "user" ? "none" : "0 2px 6px rgba(0,0,0,0.03)"
                  }}
                >
                  {m.text}
                </div>
                <small style={{ fontSize: "10px", color: "#8fa39e", marginTop: "3px", padding: "0 4px" }}>
                  {m.timestamp}
                </small>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", background: "#ffffff", padding: "10px 14px", borderRadius: "14px 14px 14px 2px", fontSize: "12px", color: "#546e6d", border: "1px solid #e1ebe5" }}>
                <RefreshCw size={14} className="spin" style={{ display: "inline", marginRight: "6px" }} />
                Yorisoi AI is analyzing…
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            style={{
              padding: "12px",
              background: "#ffffff",
              borderTop: "1px solid #e3ebe7",
              display: "flex",
              gap: "8px"
            }}
          >
            <input
              type="text"
              placeholder={userRole === "patient" ? "Ask a health question…" : "Type clinical query..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #d0ded6",
                borderRadius: "8px",
                fontSize: "13px",
                outline: "none"
              }}
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
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
