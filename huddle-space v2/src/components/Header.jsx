import Logo from "./Logo";
import { Bell, Shield, Mail } from "lucide-react";
import { ADMIN_NAMES } from "../constants";
import { timeAgo } from "../utils";

export default function Header({
  profile,
  nameOf,
  openProfile,
  notifications,
  notifPanelOpen,
  setNotifPanelOpen,
  markNotificationsRead,
  onNotifClick,
  reports,
  posts,
 onOpenTasks,
  onOpenAI,
  onOpenGmail,
  onOpenTeam,
  onOpenReports,
  onOpenDM,
}) {
  const isAdmin = ADMIN_NAMES.includes(profile.name);
  const hasUnresolvedReports = reports.some((r) => !r.resolved && posts.some((p) => p.id === r.postId));

  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Logo size={24} />
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 28, color: "#EDEDEF" }}>Huddle Space</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {typeof Notification !== "undefined" && Notification.permission === "default" && (
          <button
            onClick={() => Notification.requestPermission()}
            className="hs-icon-btn"
            style={{
              background: "none",
              border: "1px solid #2E2E33",
              borderRadius: 999,
              color: "#8B8B93",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 11,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            Enable notifications
          </button>
        )}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => {
              setNotifPanelOpen((o) => {
                if (!o) markNotificationsRead();
                return !o;
              });
            }}
            title="Notifications"
            className="hs-icon-btn"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", position: "relative", width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Bell size={18} />
            {notifications.some((n) => !n.read) && (
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: 7,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#FF8A4C",
                  border: "1px solid #16161A",
                }}
              />
            )}
          </button>
          {notifPanelOpen && (
            <div
              style={{
                position: "fixed",
                top: 64,
                right: 12,
                left: "auto",
                width: 300,
                maxWidth: "92vw",
                maxHeight: 380,
                overflowY: "auto",
                background: "#1C1C1F",
                border: "1px solid #2E2E33",
                borderRadius: 14,
                boxShadow: "0 8px 24px rgba(43,42,40,0.15)",
                zIndex: 70,
              }}
            >
              {notifications.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13 }}>
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onNotifClick(n)}
                    style={{
                      padding: "12px 14px",
                      borderBottom: "1px solid #2A2A2D",
                      cursor: "pointer",
                      background: n.read ? "transparent" : "rgba(255,138,76,0.10)",
                    }}
                  >
                    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#EDEDEF" }}>{n.message}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93", marginTop: 2 }}>{timeAgo(n.timestamp)}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <button
          onClick={onOpenTasks}
          title="Tasks"
          className="hs-icon-btn"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          ✓
        </button>
        <button
          onClick={onOpenAI}
          title="AI Assistant"
          className="hs-icon-btn"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          ✨
        </button>
        <button
          onClick={onOpenGmail}
          title="Gmail"
          className="hs-icon-btn"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          📧
        </button>
        <button
          onClick={() => { alert("button works"); onOpenTeam(); }}
          title="Team Members"
          className="hs-icon-btn"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          👥
        </button>
        {isAdmin && (
          <div style={{ position: "relative" }}>
            <button
              onClick={onOpenReports}
              title="Reports (admin)"
              className="hs-icon-btn"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
            >
              <Shield size={18} />
              {hasUnresolvedReports && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 7,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#FF8A4C",
                    border: "1px solid #1C1C1F",
                  }}
                />
              )}
            </button>
          </div>
        )}
        <button
          onClick={onOpenDM}
          title="Messages"
          className="hs-icon-btn"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Mail size={18} />
        </button>
        <div
          onClick={() => openProfile(profile.name)}
          style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#8B8B93", cursor: "pointer", marginLeft: 4 }}
        >
          hi, {nameOf(profile.name)}
        </div>
      </div>
    </div>
  );
}
