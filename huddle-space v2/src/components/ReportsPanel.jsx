import { X, Shield } from "lucide-react";

export default function ReportsPanel({ onClose, reports, posts, nameOf, dismissReport, deletePost }) {
  const openReports = reports.filter((r) => !r.resolved && posts.some((p) => p.id === r.postId));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 400, maxWidth: "92vw", maxHeight: "80vh", overflowY: "auto", background: "#1C1C1F", border: "1px solid #2E2E33", borderRadius: 20, padding: "24px", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#8B8B93" }}>
          <X size={18} />
        </button>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 20, color: "#EDEDEF", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Shield size={18} color="#FF8A4C" /> Reported posts ({openReports.length})
        </div>
        {openReports.length === 0 ? (
          <div style={{ textAlign: "center", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, padding: "24px 0" }}>
            Nothing to review right now.
          </div>
        ) : (
          openReports.map((r) => {
            const post = posts.find((p) => p.id === r.postId);
            return (
              <div key={r.id} style={{ border: "1px solid #2E2E33", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#8B8B93", marginBottom: 4 }}>
                  Post by <span style={{ color: "#EDEDEF", fontWeight: 600 }}>{nameOf(r.postAuthor)}</span> · reported by {nameOf(r.reportedBy)}
                </div>
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#EDEDEF", marginBottom: 10, lineHeight: 1.4 }}>
                  {r.postTextSnippet}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => dismissReport(r.id)}
                    style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid #2E2E33", background: "transparent", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, cursor: "pointer" }}
                  >
                    Dismiss
                  </button>
                  {post && (
                    <button
                      onClick={() => {
                        deletePost(post.id, post.author);
                        dismissReport(r.id);
                      }}
                      style={{ padding: "6px 14px", borderRadius: 999, border: "none", background: "#FF8A4C", color: "#16161A", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                    >
                      Delete post
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
