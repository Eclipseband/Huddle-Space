import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles } from "lucide-react";

const WORKER_URL = "https://huddle-space.eclipsebandjh.workers.dev/";

export default function AIAssistant({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await response.json();
      const reply = data?.content?.[0]?.text || data?.error?.message || JSON.stringify(data);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong reaching the assistant." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 480, maxWidth: "94vw", height: 600, maxHeight: "85vh", background: "#1C1C1F", border: "1px solid #2E2E33", borderRadius: 20, display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 20px", borderBottom: "1px solid #2E2E33" }}>
          <Sparkles size={18} color="#FF8A4C" />
          <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 18, color: "#EDEDEF", flex: 1 }}>Assistant</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93" }}>
            <X size={18} />
          </button>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, marginTop: 20 }}>
              Ask me anything.
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "80%",
                    background: m.role === "user" ? "#FF8A4C" : "#26262B",
                    color: m.role === "user" ? "#16161A" : "#EDEDEF",
                    border: m.role === "user" ? "none" : "1px solid #2E2E33",
                    borderRadius: 14,
                    padding: "8px 12px",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 13.5,
                    lineHeight: 1.4,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8B93" }}>Thinking…</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, padding: "12px 20px", borderTop: "1px solid #2E2E33" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask something…"
            style={{ flex: 1, padding: "9px 12px", borderRadius: 999, border: "1px solid #2E2E33", background: "#16161A", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: input.trim() ? "#FF8A4C" : "#2E2E33", color: "#16161A", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() ? "pointer" : "default", flexShrink: 0 }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
