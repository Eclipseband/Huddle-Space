import { useState } from "react";
import { X, Plus, Users } from "lucide-react";
import useProjects from "../hooks/useProjects";
import ProjectWorkspace from "./ProjectWorkspace";
import { AVATAR_COLORS } from "../constants";

const ICON_OPTIONS = ["🚀", "📁", "💡", "🛠️", "📊", "🎯", "🧠", "💼", "🔥", "⚡"];

export default function ProjectsPanel({ onClose, profile, members, memberNames, isOnline, nameOf, openProfile }) {
  const { projects, createProject } = useProjects(profile);
  const [creating, setCreating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [selectedMembers, setSelectedMembers] = useState(profile ? [profile.name] : []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  function toggleMember(n) {
    setSelectedMembers((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  async function handleCreate() {
    if (!name.trim()) return;
    await createProject({ name, description, icon, color, members: selectedMembers });
    setName("");
    setDescription("");
    setIcon(ICON_OPTIONS[0]);
    setColor(AVATAR_COLORS[0]);
    setSelectedMembers(profile ? [profile.name] : []);
    setCreating(false);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 720, maxWidth: "96vw", height: 640, maxHeight: "90vh", background: "#1C1C1F", border: "1px solid #2E2E33", borderRadius: 20, display: "flex", flexDirection: "column", position: "relative" }}
      >
        {selectedProject ? (
          <>
            <ProjectWorkspace
              project={selectedProject}
              members={members}
              nameOf={nameOf}
              isOnline={isOnline}
              openProfile={openProfile}
              onBack={() => setSelectedProjectId(null)}
            />
            <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#8B8B93" }}>
              <X size={18} />
            </button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid #2E2E33" }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 18, color: "#EDEDEF", flex: 1 }}>Projects</div>
              {!creating && (
                <button
                  onClick={() => setCreating(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, background: "none",
                    border: "1px solid #2E2E33", borderRadius: 999, color: "#FF8A4C",
                    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600,
                    padding: "6px 12px", cursor: "pointer",
                  }}
                >
                  <Plus size={13} /> New Project
                </button>
              )}
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {creating ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Project name…"
                    style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #2E2E33", background: "#16161A", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, outline: "none" }}
                  />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this project about?"
                    rows={3}
                    style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #2E2E33", background: "#16161A", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none", resize: "none" }}
                  />

                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8B93", marginBottom: 8 }}>ICON</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {ICON_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setIcon(opt)}
                          style={{
                            width: 34, height: 34, borderRadius: 8, fontSize: 16,
                            border: icon === opt ? "2px solid #FF8A4C" : "1px solid #2E2E33",
                            background: "#16161A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8B93", marginBottom: 8 }}>COLOR</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setColor(c)}
                          style={{
                            width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer",
                            border: color === c ? "2px solid #EDEDEF" : "2px solid transparent",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8B93", marginBottom: 8 }}>MEMBERS</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {memberNames.map((n) => (
                        <button
                          key={n}
                          onClick={() => toggleMember(n)}
                          style={{
                            padding: "6px 12px", borderRadius: 999,
                            border: selectedMembers.includes(n) ? "1px solid #FF8A4C" : "1px solid #2E2E33",
                            background: selectedMembers.includes(n) ? "#FF8A4C" : "transparent",
                            color: selectedMembers.includes(n) ? "#16161A" : "#8B8B93",
                            fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          {nameOf(n)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                    <button
                      onClick={() => setCreating(false)}
                      style={{ padding: "8px 16px", borderRadius: 999, border: "1px solid #2E2E33", background: "transparent", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!name.trim()}
                      style={{
                        padding: "8px 16px", borderRadius: 999, border: "none",
                        background: name.trim() ? "#FF8A4C" : "#2E2E33", color: "#16161A",
                        fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12,
                        cursor: name.trim() ? "pointer" : "default",
                      }}
                    >
                      Create Project
                    </button>
                  </div>
                </div>
              ) : projects.length === 0 ? (
                <div style={{ textAlign: "center", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, marginTop: 40 }}>
                  No projects yet. Tap "New Project" to start one.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {projects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProjectId(p.id)}
                      style={{
                        background: "#16161A", border: `1px solid ${p.color || "#2E2E33"}33`, borderRadius: 14,
                        padding: 16, cursor: "pointer", display: "flex", flexDirection: "column", gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 26 }}>{p.icon}</div>
                      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 14, color: "#EDEDEF" }}>{p.name}</div>
                      <div
                        style={{
                          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#8B8B93", lineHeight: 1.4,
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                        }}
                      >
                        {p.description || "No description yet."}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, color: "#5C5C63" }}>
                        <Users size={12} />
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>{(p.members || []).length}</span>
                      </div>
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
