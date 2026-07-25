import { useEffect, useRef } from "react";
import { X, Mail, ArrowLeft, Send } from "lucide-react";
import Avatar from "./Avatar";
import { timeAgo } from "../utils";

export default function DMPanel({
  onClose,
  dmWith, setDmWith,
  dmNewChatOpen, setDmNewChatOpen,
  conversations,
  dmMessages,
  dmDraft, setDmDraft,
  sendDm,
  openConversation,
  profile,
  members,
  memberNames,
  isOnline,
  nameOf,
}) {
  const dmScrollRef = useRef(null);

  useEffect(() => {
    if (dmScrollRef.current) {
      dmScrollRef.current.scrollTop = dmScrollRef.current.scrollHeight;
    }
  }, [dmMessages, dmWith]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(43,42,40,0.35)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 360, maxWidth: "92vw", height: "100%", background: "#1C1C1F", boxShadow: "-6px 0 24px rgba(43,42,40,0.15)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", borderBottom: "1px solid #2E2E33" }}>
          {dmWith || dmNewChatOpen ? (
            <button
              onClick={() => {
                setDmWith(null);
                setDmNewChatOpen(false);
              }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", padding: 0 }}
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <Mail size={18} color="#8B8B93" />
          )}
          <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 18, color: "#EDEDEF", flex: 1 }}>
            {dmWith ? nameOf(dmWith) : dmNewChatOpen ? "New message" : "Messages"}
          </div>
          {!dmWith && !dmNewChatOpen && (
            <button
              onClick={() => setDmNewChatOpen(true)}
              title="Start a new conversation"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#FF8A4C", padding: 0, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 600 }}
            >
              New
            </button>
          )}
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", padding: 0 }}>
            <X size={18} />
          </button>
        </div>

        {!dmWith && dmNewChatOpen ? (
          <div style={{ overflowY: "auto", flex: 1 }}>
            {memberNames.filter((n) => n !== profile.name).length === 0 ? (
              <div style={{ padding: 24, color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, textAlign: "center" }}>Nobody else has joined yet.</div>
            ) : (
              memberNames
                .filter((n) => n !== profile.name)
                .map((n) => (
                  <div
                    key={n}
                    onClick={() => {
                      setDmNewChatOpen(false);
                      openConversation(n);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", cursor: "pointer", borderBottom: "1px solid #2A2A2D" }}
                  >
                    <Avatar name={n} size={34} photoURL={members[n]?.photoURL} online={isOnline(n)} />
                    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: "#EDEDEF" }}>{nameOf(n)}</div>
                  </div>
                ))
            )}
          </div>
        ) : !dmWith ? (
          <div style={{ overflowY: "auto", flex: 1 }}>
            {conversations.length === 0 ? (
              <div style={{ padding: 24, color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, textAlign: "center" }}>
                No conversations yet. Tap "New" to message someone.
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => openConversation(c.with)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", cursor: "pointer", borderBottom: "1px solid #2A2A2D" }}
                >
                  <Avatar name={c.with} size={34} photoURL={members[c.with]?.photoURL} online={isOnline(c.with)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: "#EDEDEF" }}>{nameOf(c.with)}</div>
                    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#8B8B93", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.lastMessage}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#5C5C63", flexShrink: 0 }}>
                    {timeAgo(c.lastTimestamp)}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            <div ref={dmScrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              {dmMessages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#8B8B93", fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif", marginTop: 20 }}>No messages yet. Say hi to {dmWith}.</div>
              ) : (
                dmMessages.map((m, i) => {
                  const mine = m.from === profile.name;
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                      <div
                        style={{
                          maxWidth: "78%", background: mine ? "#FF8A4C" : "#26262B", color: mine ? "#16161A" : "#EDEDEF",
                          border: mine ? "none" : "1px solid #2E2E33", borderRadius: 14, padding: "8px 12px",
                          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, lineHeight: 1.4,
                        }}
                      >
                        {m.text}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#5C5C63", marginTop: 2, padding: "0 4px" }}>
                        {timeAgo(m.timestamp)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid #2E2E33" }}>
              <input
                value={dmDraft}
                onChange={(e) => setDmDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendDm()}
                placeholder="Write a message…"
                style={{ flex: 1, padding: "9px 12px", borderRadius: 999, border: "1px solid #2E2E33", background: "#1C1C1F", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none" }}
              />
              <button
                onClick={sendDm}
                disabled={!dmDraft.trim()}
                style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: dmDraft.trim() ? "#FF8A4C" : "#2E2E33", color: "#16161A", display: "flex", alignItems: "center", justifyContent: "center", cursor: dmDraft.trim() ? "pointer" : "default", flexShrink: 0 }}
              >
                <Send size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
