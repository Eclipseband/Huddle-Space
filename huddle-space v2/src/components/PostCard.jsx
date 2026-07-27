import { Pin, Pencil, Flag, Trash2, Smile, MessageCircle, Send } from "lucide-react";
import Avatar from "./Avatar";
import { renderWithMentions } from "../mentionsHelper";
import { timeAgo } from "../utils";
import { ADMIN_NAMES, REACTIONS } from "../constants";

export default function PostCard({
  post: p,
  profile,
  members,
  memberNames,
  isOnline,
  nameOf,
  openProfile,
  editingPostId,
  editDraft,
  setEditDraft,
  startEditPost,
  cancelEditPost,
  saveEditPost,
  reportPost,
  togglePin,
  deletePost,
  votePoll,
  reactionPickerOpen,
  setReactionPickerOpen,
  reactionListOpen,
  setReactionListOpen,
  customEmoji,
  setCustomEmoji,
  setReaction,
  openComments,
  setOpenComments,
  commentDrafts,
  setCommentDrafts,
  addComment,
}) {
  const isAdmin = ADMIN_NAMES.includes(profile.name);
  const reactions = p.reactions || {};
  const reactionEntries = Object.entries(reactions).filter(([, names]) => names.length > 0);
  const totalReactions = reactionEntries.reduce((sum, [, names]) => sum + names.length, 0);
  const myReaction = reactionEntries.find(([, names]) => names.includes(profile.name))?.[0] || null;
  const pickerOpen = reactionPickerOpen[p.id];
  const commentsOpen = openComments[p.id];

  return (
    <div style={{ background: "#1C1C1F", border: p.pinned ? "1px solid #FF8A4C" : "1px solid #2E2E33", borderRadius: 16, padding: 18 }}>
      {p.pinned && (
       <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#FF8A4C" }}>
          <Pin size={12} /> Pinned
        </div>
      )}
     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div
          onClick={() => openProfile(p.author)}
          style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10, cursor: "pointer", width: "fit-content" }}
        >
          <Avatar name={p.author} size={38} photoURL={members[p.author]?.photoURL} online={isOnline(p.author)} />
          <div>
            <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 14, color: "#EDEDEF" }}>{nameOf(p.author)}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8B93" }}>
              {timeAgo(p.timestamp)}
              {p.edited && " · edited"}
            </div>
          </div>
        </div>
       <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          {isAdmin && (
            <button
              onClick={() => togglePin(p.id, p.pinned)}
              title={p.pinned ? "Unpin post" : "Pin post (admin)"}
              className="hs-icon-btn"
              style={{ background: "none", border: "none", cursor: "pointer", color: p.pinned ? "#FF8A4C" : "#5C5C63", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Pin size={15} />
            </button>
          )}
          {p.author === profile.name && (
            <button
              onClick={() => startEditPost(p)}
              title="Edit post"
              className="hs-icon-btn"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#5C5C63", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Pencil size={14} />
            </button>
          )}
          {p.author !== profile.name && (
            <button
              onClick={() => reportPost(p)}
              title="Report post"
              className="hs-icon-btn"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#5C5C63", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Flag size={14} />
            </button>
          )}
          {(p.author === profile.name || isAdmin) && (
            <button
              onClick={() => deletePost(p.id, p.author)}
              title={p.author === profile.name ? "Delete post" : "Delete post (admin)"}
              className="hs-icon-btn"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: p.author === profile.name ? "#5C5C63" : "#FF8A4C",
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {editingPostId === p.id ? (
        <div style={{ marginBottom: 10 }}>
          <textarea
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            rows={3}
            style={{
              width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid #2E2E33",
              background: "#16161A", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, resize: "none", outline: "none",
            }}
          />
         splay: "flex", gap: 8, marginTop: 6 }}>
            <button
              onClick={cancelEditPost}
              style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid #2E2E33", background: "transparent", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={() => saveEditPost(p.id)}
              style={{ padding: "6px 14px", borderRadius: 999, border: "none", background: "#FF8A4C", color: "#16161A", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        p.text && (
          <div
            style={{
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: "#EDEDEF", lineHeight: 1.5,
              marginBottom: p.imageUrl || p.videoUrl || p.poll ? 12 : 4, whiteSpace: "pre-wrap",
            }}
          >
            {renderWithMentions(p.text, memberNames, openProfile)}
          </div>
        )
      )}

      {p.poll && (
        <div style={{ marginBottom: p.imageUrl || p.videoUrl ? 12 : 4 }}>
          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 14, color: "#EDEDEF", marginBottom: 8 }}>
            {p.poll.question}
          </div>
          {(() => {
            const totalVotes = p.poll.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
            return p.poll.options.map((opt, i) => {
              const voteCount = opt.votes?.length || 0;
              const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
              const iVoted = (opt.votes || []).includes(profile.name);
              return (
                <div
                  key={i}
                  onClick={() => votePoll(p.id, i)}
                  style={{
                    position: "relative", border: iVoted ? "1px solid #FF8A4C" : "1px solid #2E2E33",
                    borderRadius: 8, padding: "8px 10px", marginBottom: 6, cursor: "pointer", overflow: "hidden",
                  }}
                >
                  <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: "rgba(255,138,76,0.14)" }} />
                  <div style={{ position: "relative", display: "flex", justifyContent: "space-between", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#EDEDEF" }}>
                    <span>{opt.text}</span>
                    <span style={{ color: "#8B8B93", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>{pct}%</span>
                  </div>
                </div>
              );
            });
          })()}
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93", marginTop: 2 }}>
            {p.poll.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0)} votes
          </div>
        </div>
      )}

      {p.imageUrl && (
        <img src={p.imageUrl} alt="" style={{ width: "100%", borderRadius: 12, marginBottom: 10, display: "block" }} onError={(e) => (e.target.style.display = "none")} />
      )}
      {p.videoUrl && (
        <video src={p.videoUrl} controls style={{ width: "100%", borderRadius: 12, marginBottom: 10, display: "block" }} />
      )}

      {reactionEntries.length > 0 && (
       splay: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          {reactionEntries.map(([emoji, names]) => (
            <div key={emoji} style={{ position: "relative" }}>
              <button
                onClick={() => setReactionListOpen((cur) => (cur?.postId === p.id && cur?.emoji === emoji ? null : { postId: p.id, emoji }))}
                style={{
                  display: "flex", alignItems: "center", gap: 4, background: "#1C1C1F",
                  border: myReaction === emoji ? "1px solid #FF8A4C" : "1px solid #2E2E33", borderRadius: 999,
                  padding: "2px 8px", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "#EDEDEF", cursor: "pointer",
                }}
              >
                <span>{emoji}</span>
                <span>{names.length}</span>
              </button>
              {reactionListOpen?.postId === p.id && reactionListOpen?.emoji === emoji && (
                <div
                  style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#1C1C1F", border: "1px solid #2E2E33",
                    borderRadius: 10, padding: "8px 12px", boxShadow: "0 4px 16px rgba(43,42,40,0.12)", zIndex: 20,
                    whiteSpace: "nowrap", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#EDEDEF",
                  }}
                >
                  {names.map((n) => (
                    <div
                      key={n}
                      onClick={() => {
                        setReactionListOpen(null);
                        openProfile(n);
                      }}
                      style={{ cursor: "pointer", padding: "2px 0" }}
                    >
                      {nameOf(n)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 18, marginTop: 8, paddingTop: 10, borderTop: "1px solid #2A2A2D", alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setReactionPickerOpen((o) => ({ ...o, [p.id]: !o[p.id] }))}
            style={{
              display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer",
              color: myReaction ? "#FF8A4C" : "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13,
            }}
          >
            {myReaction ? <span style={{ fontSize: 16 }}>{myReaction}</span> : <Smile size={16} />}
            {totalReactions > 0 ? totalReactions : ""} React
          </button>
          {pickerOpen && (
            <div
              style={{
                position: "absolute", bottom: "calc(100% + 8px)", left: 0, background: "#1C1C1F", border: "1px solid #2E2E33",
                borderRadius: 999, padding: "6px 8px", display: "flex", gap: 6, boxShadow: "0 4px 16px rgba(43,42,40,0.12)", zIndex: 10,
              }}
            >
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setReaction(p.id, emoji)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 2, transform: myReaction === emoji ? "scale(1.15)" : "scale(1)" }}
                >
                  {emoji}
                </button>
              ))}
              <input
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customEmoji.trim()) {
                    setReaction(p.id, customEmoji.trim());
                    setCustomEmoji("");
                  }
                }}
                placeholder="🖊️"
                title="Type or paste any emoji, then press Enter"
                style={{
                  width: 34, textAlign: "center", background: "#16161A", border: "1px solid #2E2E33", borderRadius: 999,
                  color: "#EDEDEF", fontSize: 15, padding: "2px 4px", outline: "none",
                }}
              />
            </div>
          )}
        </div>
        <button
          onClick={() => setOpenComments((o) => ({ ...o, [p.id]: !o[p.id] }))}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13 }}
        >
          <MessageCircle size={16} />
          {p.comments.length > 0 ? p.comments.length : ""} Comment{p.comments.length === 1 ? "" : "s"}
        </button>
      </div>

      {commentsOpen && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {p.comments.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Avatar name={c.author} size={26} photoURL={members[c.author]?.photoURL} />
              <div style={{ background: "#1C1C1F", borderRadius: 12, padding: "6px 12px", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#EDEDEF" }}>
                <span style={{ fontWeight: 600 }}>{nameOf(c.author)}</span> {renderWithMentions(c.text, memberNames, openProfile)}
              </div>
            </div>
          ))}
         <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input
              value={commentDrafts[p.id] || ""}
              onChange={(e) => setCommentDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addComment(p.id, commentDrafts[p.id])}
              placeholder="Write a comment…"
              style={{ flex: 1, padding: "8px 12px", borderRadius: 999, border: "1px solid #2E2E33", background: "#1C1C1F", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none" }}
            />
            <button
              onClick={() => addComment(p.id, commentDrafts[p.id])}
              disabled={!(commentDrafts[p.id] || "").trim()}
              style={{
                width: 36, height: 36, borderRadius: "50%", border: "none",
                background: (commentDrafts[p.id] || "").trim() ? "#FF8A4C" : "#2E2E33",
                color: "#16161A", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: (commentDrafts[p.id] || "").trim() ? "pointer" : "default", flexShrink: 0,
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
