export default function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <ellipse cx="26.5" cy="26.5" rx="6" ry="10" fill="#FF8A4C" opacity="1" transform="rotate(45 26.5 26.5)" />
      <ellipse cx="13.5" cy="26.5" rx="6" ry="10" fill="#FF8A4C" opacity="0.8" transform="rotate(-45 13.5 26.5)" />
      <ellipse cx="13.5" cy="13.5" rx="6" ry="10" fill="#FF8A4C" opacity="0.6" transform="rotate(45 13.5 13.5)" />
      <ellipse cx="26.5" cy="13.5" rx="6" ry="10" fill="#FF8A4C" opacity="0.4" transform="rotate(-45 26.5 13.5)" />
      <circle cx="20" cy="20" r="3.4" fill="#121214" />
      <circle cx="20" cy="20" r="3.4" fill="none" stroke="#FF8A4C" strokeWidth="1.2" />
    </svg>
  );
}
