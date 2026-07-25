import PostCard from "./PostCard";

export default function Feed({ posts, feedFilter, setFeedFilter, profile, members, ...rest }) {
  const myFollowing = members[profile.name]?.following || [];
  const visiblePostsRaw = feedFilter === "following" ? posts.filter((p) => p.author === profile.name || myFollowing.includes(p.author)) : posts;
  const visiblePosts = [...visiblePostsRaw].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "following"].map((f) => (
          <button
            key={f}
            onClick={() => setFeedFilter(f)}
            style={{
              padding: "6px 14px", borderRadius: 999,
              border: feedFilter === f ? "1px solid #FF8A4C" : "1px solid #2E2E33",
              background: feedFilter === f ? "#FF8A4C" : "transparent",
              color: feedFilter === f ? "#16161A" : "#8B8B93",
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
            }}
          >
            {f}
          </button>
        ))}
      </div>
      {visiblePosts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
          {feedFilter === "following" ? "Nobody you follow has posted yet." : "Nobody's posted yet. Be the first to say something."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {visiblePosts.map((p) => (
            <PostCard key={p.id} post={p} profile={profile} members={members} {...rest} />
          ))}
        </div>
      )}
    </>
  );
}
