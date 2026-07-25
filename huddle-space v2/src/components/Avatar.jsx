export default function Avatar({ name, size = 36, photoURL, online }) {
  const initial = name?.[0]?.toUpperCase() || "?";
  const content = photoURL ? (
    <img
      src={photoURL}
      alt={name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
        border: "2px solid #16161A",
        display: "block",
      }}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: colorForName(name),
        color: "#16161A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Fraunces', serif",
        fontWeight: 600,
        fontSize: size * 0.42,
        flexShrink: 0,
        border: "2px solid #16161A",
      }}
    >
      {initial}
    </div>
  );

  if (online === undefined) return content;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {content}
      <span
        style={{
          position: "absolute",
          bottom: -1,
          right: -1,
          width: Math.max(9, size * 0.26),
          height: Math.max(9, size * 0.26),
          borderRadius: "50%",
          background: online ? "#4ADE80" : "#5C5C63",
          border: "2px solid #16161A",
        }}
      />
    </div>
  );
}

function colorForName(name) {
  const AVATAR_COLORS = ["#FF8A4C", "#C98C82", "#8B8B93", "#B08968", "#6E7B6B", "#9C6644"];
  let h = 0;
  const n = name || "";
  for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
