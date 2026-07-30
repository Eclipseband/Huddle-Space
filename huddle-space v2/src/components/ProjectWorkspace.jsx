import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Avatar from "./Avatar";

const TABS = ["Overview", "Tasks", "Calendar", "Files", "AI", "Members", "Settings"];

export default function ProjectWorkspace({ project, members, nameOf, isOnline, openProfile, onBack }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const projectMembers = project.members || [];
  const createdDate = new Date(project.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid #2E2E33" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", padding: 0 }}>
          <ArrowLeft size={18} />
        </button>
        <span style={{ fontSize: 20 }}>{project.icon}</span>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 18, color: "#EDEDEF", flex: 1 }}>
          {project.name}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "12px 20px", borderBottom: "1px solid #2E2E33", overflowX: "auto" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: activeTab === tab ? "1px solid #FF8A4C" : "1px solid #2E2E33",
              background: activeTab === tab ? "#FF8A4C" : "transparent",
              color: activeTab === tab ? "#16161A" : "#8B8B93",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {activeTab === "Overview" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8B93", marginBottom: 6 }}>DESCRIPTION</div>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: project.description ? "#EDEDEF" : "#5C5C63", lineHeight: 1.5 }}>
                {project.description || "No description yet."}
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8B93", marginBottom: 8 }}>MEMBERS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {projectMembers.map((n) => (
                  <div
                    key={n}
                    onClick={() => openProfile(n)}
                    style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                  >
                    <Avatar name={n} size={26} photoURL={members[n]?.photoURL} online={isOnline(n)} />
                    <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#EDEDEF" }}>{nameOf(n)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8B93", marginBottom: 6 }}>CREATED</div>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#EDEDEF" }}>
                {createdDate} by {nameOf(project.createdBy)}
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8B93", marginBottom: 6 }}>RECENT ACTIVITY</div>
              <div style={{ background: "#16161A", border: "1px dashed #2E2E33", borderRadius: 10, padding: 16, textAlign: "center", color: "#5C5C63", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13 }}>
                Recent activity will show up here once Tasks, Chat, and Files are connected to this project.
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8B93", marginBottom: 6 }}>MORE ON THE WAY</div>
              <div style={{ background: "#16161A", border: "1px dashed #2E2E33", borderRadius: 10, padding: 16, textAlign: "center", color: "#5C5C63", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13 }}>
                Widgets for Tasks, Calendar, Files, and Bookkeeping will appear here as they're built.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#5C5C63", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
            {activeTab} is coming soon.
          </div>
        )}
      </div>
    </div>
  );
}
