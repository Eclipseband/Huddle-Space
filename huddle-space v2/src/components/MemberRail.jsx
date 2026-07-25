import Avatar from "./Avatar";
import { Users } from "lucide-react";

export default function MemberRail({ memberNames, members, isOnline, profile, openProfile, onOpenDirectory }) {
  return (
    <div className="hs-rail" style={{ width: 64, flexShrink: 0, paddingTop: 6 }}>
      <div
        onClick={onOpenDirectory}
        title="See everyone on Huddle Space"
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 10, cursor: "pointer" }}
      >
        <Users size={16} color="#8B8B93" />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8B93" }}>{memberNames.length}</span>
      </div>
      <div className="hs-rail-avatars" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {memberNames.map((n) => (
          <div
            key={n}
            title={n === profile.name ? `${n} (you)` : `View ${n}'s profile`}
            onClick={() => openProfile(n)}
            style={{ cursor: "pointer", opacity: n === profile.name ? 0.55 : 1 }}
          >
            <Avatar name={n} size={32} photoURL={members[n]?.photoURL} online={isOnline(n)} />
          </div>
        ))}
      </div>
    </div>
  );
}
