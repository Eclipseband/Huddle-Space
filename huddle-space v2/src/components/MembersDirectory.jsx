import { X } from "lucide-react";
import Avatar from "./Avatar";

export default function MembersDirectory({ onClose, memberNames, members, isOnline, nameOf, profile, openProfile }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(43,42,40,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 360, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto", background: "#1C1C1F", borderRadius: 20, padding: "24px", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#8B8B93" }}>
          <X size={18} />
        </button>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 20, color: "#EDEDEF", marginBottom: 16 }}>
          Everyone on Huddle Space ({memberNames.length})
        </div>
        {memberNames.map((n) => (
          <div
            key={n}
            onClick={() => {
              onClose();
              openProfile(n);
            }}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", cursor: "pointer" }}
          >
            <Avatar name={n} size={34} photoURL={members[n]?.photoURL} online={isOnline(n)} />
            <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: "#EDEDEF" }}>
              {nameOf(n)}
              {n === profile.name && <span style={{ color: "#8B8B93" }}> (you)</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
