import { useState, useEffect, useRef } from "react";
import { X, Mail, Plus, Send, RefreshCw } from "lucide-react";

const CLIENT_ID = "665258524178-u9lk3p2ulnkac5k9fshghcojnampavbu.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email";

function loadGoogleScript() {
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

function b64UrlEncode(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export default function GmailPanel({ onClose }) {
  const [accounts, setAccounts] = useState([]); // { email, token }
  const [activeEmail, setActiveEmail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadGoogleScript();
  }, []);

  async function connectAccount() {
    await loadGoogleScript();
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (response) => {
        if (response.error) return;
        const token = response.access_token;
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userInfo = await userInfoRes.json();
        setAccounts((prev) => {
          const withoutDup = prev.filter((a) => a.email !== userInfo.email);
          return [...withoutDup, { email: userInfo.email, token }];
        });
        setActiveEmail(userInfo.email);
      },
    });
    client.requestAccessToken({ prompt: "consent" });
  }

  async function loadInbox(email) {
    const account = accounts.find((a) => a.email === email);
    if (!account) return;
    setLoadingInbox(true);
    try {
      const listRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15",
        { headers: { Authorization: `Bearer ${account.token}` } }
      );
      const listData = await listRes.json();
      const ids = (listData.messages || []).map((m) => m.id);
      const details = await Promise.all(
        ids.map((id) =>
          fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
            { headers: { Authorization: `Bearer ${account.token}` } }
          ).then((r) => r.json())
        )
      );
      const parsed = details.map((d) => {
        const headers = d.payload?.headers || [];
        const subject = headers.find((h) => h.name === "Subject")?.value || "(no subject)";
        const from = headers.find((h) => h.name === "From")?.value || "Unknown sender";
        return { id: d.id, subject, from, snippet: d.snippet };
      });
      setMessages(parsed);
    } catch (err) {
      console.error("Failed to load inbox", err);
    } finally {
      setLoadingInbox(false);
    }
  }

  useEffect(() => {
    if (activeEmail) loadInbox(activeEmail);
  }, [activeEmail]);

  async function sendEmail() {
    const account = accounts.find((a) => a.email === activeEmail);
    if (!account || !composeTo.trim() || !composeSubject.trim()) return;
    setSending(true);
    try {
      const rawMessage = [
        `To: ${composeTo}`,
        `Subject: ${composeSubject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        composeBody,
      ].join("\r\n");
      const encoded = b64UrlEncode(rawMessage);
      await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encoded }),
      });
      setComposeOpen(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
    } catch (err) {
      console.error("Failed to send email", err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 640, maxWidth: "94vw", height: 640, maxHeight: "85vh", background: "#1C1C1F", border: "1px solid #2E2E33", borderRadius: 20, display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 20px", borderBottom: "1px solid #2E2E33" }}>
          <Mail size={18} color="#FF8A4C" />
          <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 18, color: "#EDEDEF", flex: 1 }}>Gmail</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, padding: "12px 20px", borderBottom: "1px solid #2E2E33", overflowX: "auto" }}>
          {accounts.map((a) => (
            <button
              key={a.email}
              onClick={() => setActiveEmail(a.email)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: activeEmail === a.email ? "1px solid #FF8A4C" : "1px solid #2E2E33",
                background: activeEmail === a.email ? "#FF8A4C" : "transparent",
                color: activeEmail === a.email ? "#16161A" : "#8B8B93",
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {a.email}
            </button>
          ))}
          <button
            onClick={connectAccount}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid #2E2E33",
              background: "transparent",
              color: "#8B8B93",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              flexShrink: 0,
            }}
          >
            <Plus size={13} /> Connect account
          </button>
        </div>

        {!activeEmail ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13 }}>
            Connect a Gmail account to get started.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px" }}>
              <button
                onClick={() => loadInbox(activeEmail)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8B8B93", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12 }}
              >
                <RefreshCw size={13} /> Refresh
              </button>
              <button
                onClick={() => setComposeOpen((v) => !v)}
                style={{ padding: "6px 14px", borderRadius: 999, border: "none", background: "#FF8A4C", color: "#16161A", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
              >
                Compose
              </button>
            </div>

            {composeOpen && (
              <div style={{ padding: "0 20px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="To…"
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #2E2E33", background: "#16161A", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none" }}
                />
                <input
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Subject…"
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #2E2E33", background: "#16161A", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none" }}
                />
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message…"
                  rows={4}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #2E2E33", background: "#16161A", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none", resize: "none" }}
                />
                <button
                  onClick={sendEmail}
                  disabled={!composeTo.trim() || !composeSubject.trim() || sending}
                  style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 999, border: "none", background: composeTo.trim() ? "#FF8A4C" : "#2E2E33", color: "#16161A", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: composeTo.trim() ? "pointer" : "default" }}
                >
                  {sending ? "Sending…" : "Send"} <Send size={13} />
                </button>
              </div>
            )}

            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
              {loadingInbox ? (
                <div style={{ textAlign: "center", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, marginTop: 20 }}>Loading inbox…</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, marginTop: 20 }}>No messages found.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {messages.map((m) => (
                    <div key={m.id} style={{ background: "#16161A", border: "1px solid #2E2E33", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 13, color: "#EDEDEF", marginBottom: 4 }}>{m.subject}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8B93", marginBottom: 6 }}>{m.from}</div>
                      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#8B8B93" }}>{m.snippet}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
