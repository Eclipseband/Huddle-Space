import { useState } from "react";
import { X, Pencil } from "lucide-react";
import Avatar from "./Avatar";
import { ADMIN_NAMES } from "../constants";

export default function TeamMembersPanel({ profile, members, memberNames, isOnline, nameOf, saveRoleAndTeam, openProfile, onClose }) {
  const [editingName, setEditingName] = useState(null);
  const [roleDraft, setRoleDraft] = useState("");
  const [teamDraft, setTeamDraft] = useState("");
  const isAdmin = ADMIN_NAMES.includes(profile.name);

  function startEdit(name) {
    setEditingName(name);
    setRoleDraft(members[name]?.role || "");
    setTeamDraft(members[name]?.team || "");
  }

  async function save(name) {
    await saveRoleAndTeam(name, roleDraft, teamDraft);
    setEditingName(null);
  }

  const groups = {};
  memberNames.forEach((n) => {
    const team = members[n]?.team?.trim() || "No team";
    if (!groups[team]) groups[team] = [];
    groups[team].push(n);
  });
  const teamNames = Object.keys(groups).sort((a, b) => (a === "No team" ? 1 : b === "No team" ? -1 : a.localeCompare(b)));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 480, maxWidth: "94vw", maxHeight: "85vh", overflowY: "auto", background: "#1C1C1F", border: "1px solid #2E2E33", borderRadius: 20, padding: 24, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#8B8B93" }}>
          <X size={18} />
        </button>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 20, color: "#EDEDEF", marginBottom: 20 }}>Team Members</div>

        {teamNames.map((team) => (
          <div key={team} style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8B93", marginBottom: 8, textTransform: "uppercase" }}>
              {team}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groups[team].map((n) => {
                const canEdit = n === profile.name || isAdmin;
                const isEditing = editingName === n;
                return (
                  <div key={n} style={{ background: "#16161A", border: "1px solid #2E2E33", borderRadius: 10, padding: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div onClick={() => openProfile(n)} style={{ cursor: "pointer" }}>
                        <Avatar name={n} size={34} photoURL={members[n]?.photoURL} online={isOnline(n)} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: "#EDEDEF" }}>{nameOf(n)}</div>
                        {!isEditing && (
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8B93" }}>
                            {members[n]?.role || "No role set"}
                          </div>
                        )}
                      </div>
                      {canEdit && !isEditing && (
                        <button onClick={() => startEdit(n)} style={{ background: "none", border: "none", cursor: "pointer", color: "#5C5C63" }}>
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                    {isEditing && (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                        <input
                          value={roleDraft}
                          onChange={(e) => setRoleDraft(e.target.value)}
                          placeholder="Role / title"
                          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #2E2E33", background: "#1C1C1F", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none" }}
                        />
                        <input
                          value={teamDraft}
                          onChange={(e) => setTeamDraft(e.target.value)}
                          placeholder="Team / department"
                          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #2E2E33", background: "#1C1C1F", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none" }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => setEditingName(null)} style={{ padding: "5px 12px", borderRadius: 999, border: "1px solid #2E2E33", background: "transparent", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, cursor: "pointer" }}>
                            Cancel
                          </button>
                          <button onClick={() => save(n)} style={{ padding: "5px 12px", borderRadius: 999, border: "none", background: "#FF8A4C", color: "#16161A", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
