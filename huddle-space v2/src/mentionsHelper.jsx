export function extractMentionedNames(text, memberNames) {
  if (!text) return [];
  return memberNames.filter((n) => text.includes("@" + n));
}

export function renderWithMentions(text, memberNames, onClickName) {
  if (!text) return text;
  const sorted = [...memberNames].sort((a, b) => b.length - a.length);
  if (sorted.length === 0) return text;
  const escaped = sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`@(${escaped.join("|")})`, "g");
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const name = match[1];
    parts.push(
      <span
        key={key++}
        onClick={(e) => {
          e.stopPropagation();
          onClickName(name);
        }}
        style={{ color: "#FF8A4C", fontWeight: 600, cursor: "pointer" }}
      >
        @{name}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
