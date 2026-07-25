export default function Wrap({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#121214" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;1,500&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; }
        body { margin: 0; }
        input::placeholder, textarea::placeholder { color: #5C5C63; }
        input, textarea { color: #EDEDEF; }
        .hs-icon-btn { transition: background 0.15s ease; }
        .hs-icon-btn:hover { background: #232327; }

        @media (max-width: 640px) {
          .hs-layout {
            flex-direction: column !important;
            padding: 16px 12px !important;
            gap: 12px !important;
          }
          .hs-rail {
            width: 100% !important;
            padding-top: 0 !important;
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
          }
          .hs-rail-avatars {
            flex-direction: row !important;
            overflow-x: auto;
            padding-bottom: 4px;
          }
        }
      `}</style>
      {children}
    </div>
  );
}
