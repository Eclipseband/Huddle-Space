import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, MessageCircle, Image as ImageIcon, Send, Users, X, Smile, Mail, ArrowLeft } from "lucide-react";
import { db, storage } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const AVATAR_COLORS = ["#A65D56", "#C98C82", "#8A7E72", "#B08968", "#6E7B6B", "#9C6644"];
const REACTIONS = ["❤️", "😂", "👍", "😮", "😢"];
const PROFILE_KEY = "huddle-space-profile";

function colorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function compressImageFile(file, maxDim = 1000, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function timeAgo(ts) {
  if (!ts) return "just now";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function convKey(a, b) {
  return [a, b].sort().join("__");
}

function Avatar({ name, size = 36 }) {
  const initial = name?.[0]?.toUpperCase() || "?";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: colorFor(name || ""),
        color: "#F6F1E7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Fraunces', serif",
        fontWeight: 600,
        fontSize: size * 0.42,
        flexShrink: 0,
        border: "2px solid #F6F1E7",
      }}
    >
      {initial}
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [members, setMembers] = useState({});
  const [posts, setPosts] = useState([]);
  const [composeText, setComposeText] = useState("");
  const [composeImage, setComposeImage] = useState(null); // { blob, previewUrl }
  const [openComments, setOpenComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [posting, setPosting] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [imageError, setImageError] = useState("");
  const [reactionPickerOpen, setReactionPickerOpen] = useState({});
  const [dmPanelOpen, setDmPanelOpen] = useState(false);
  const [dmWith, setDmWith] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const fileInputRef = useRef(null);
  const dmScrollRef = useRef(null);

  // Load profile from this browser's localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) setProfile(JSON.parse(saved));
  }, []);

  // Members: realtime listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "members"), (snap) => {
      const next = {};
      snap.forEach((d) => (next[d.id] = d.data()));
      setMembers(next);
    });
    return () => unsub();
  }, []);

  // Posts: realtime listener, newest first
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now(),
            reactions: data.reactions || {},
            comments: data.comments || [],
          };
        })
      );
    });
    return () => unsub();
  }, []);

  // DM thread: realtime listener while a conversation is open
  useEffect(() => {
    if (!dmPanelOpen || !dmWith || !profile) return;
    const key = convKey(profile.name, dmWith);
    const unsub = onSnapshot(doc(db, "dms", key), (d) => {
      setDmMessages(d.exists() ? d.data().messages || [] : []);
    });
    return () => unsub();
  }, [dmPanelOpen, dmWith, profile]);

  useEffect(() => {
    if (dmScrollRef.current) {
      dmScrollRef.current.scrollTop = dmScrollRef.current.scrollHeight;
    }
  }, [dmMessages, dmWith]);

  async function joinHuddle() {
    const name = nameInput.trim();
    if (!name) return;
    const newProfile = { name };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    setProfile(newProfile);
    setDoc(doc(db, "members", name), { joinedAt: Date.now() });
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("That file isn't an image.");
      return;
    }
    setImageError("");
    setImageProcessing(true);
    try {
      const blob = await compressImageFile(file);
      setComposeImage({ blob, previewUrl: URL.createObjectURL(blob) });
    } catch {
      setImageError("Couldn't process that photo. Try a different file.");
    } finally {
      setImageProcessing(false);
    }
  }

  async function sharePost() {
    const text = composeText.trim();
    if (!text) return;
    setPosting(true);
    try {
      let imageUrl = null;
      if (composeImage) {
        const filename = `images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, composeImage.blob);
        imageUrl = await getDownloadURL(storageRef);
      }
      await addDoc(collection(db, "posts"), {
        author: profile.name,
        text,
        imageUrl,
        timestamp: serverTimestamp(),
        reactions: {},
        comments: [],
      });
      setComposeText("");
      setComposeImage(null);
      setImageError("");
    } catch (err) {
      setImageError("Something went wrong posting. Try again.");
    } finally {
      setPosting(false);
    }
  }

  async function setReaction(postId, emoji) {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const reactions = {};
    Object.keys(post.reactions || {}).forEach((e) => {
      const filtered = post.reactions[e].filter((n) => n !== profile.name);
      if (filtered.length) reactions[e] = filtered;
    });
    const alreadyHadThis = (post.reactions?.[emoji] || []).includes(profile.name);
    if (!alreadyHadThis) {
      reactions[emoji] = [...(reactions[emoji] || []), profile.name];
    }
    setReactionPickerOpen((o) => ({ ...o, [postId]: false }));
    await updateDoc(doc(db, "posts", postId), { reactions });
  }

  async function addComment(postId) {
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const nextComments = [...(post.comments || []), { author: profile.name, text, timestamp: Date.now() }];
    setCommentDrafts((d) => ({ ...d, [postId]: "" }));
    await updateDoc(doc(db, "posts", postId), { comments: nextComments });
  }

  function openConversation(name) {
    if (!name || name === profile.name) return;
    setDmWith(name);
    setDmPanelOpen(true);
  }

  const [dmDraft, setDmDraft] = useState("");
  async function sendDm() {
    const text = dmDraft.trim();
    if (!text || !dmWith || !profile) return;
    setDmDraft("");
    const key = convKey(profile.name, dmWith);
    const ref_ = doc(db, "dms", key);
    const snap = await getDoc(ref_);
    const existing = snap.exists() ? snap.data().messages || [] : [];
    await setDoc(ref_, {
      messages: [...existing, { from: profile.name, text, timestamp: Date.now() }],
    });
  }

  const memberNames = Object.keys(members);

  if (!profile) {
    return (
      <Wrap>
        <div
          style={{
            maxWidth: 380,
            margin: "80px auto",
            padding: "40px 36px",
            background: "#F6F1E7",
            borderRadius: 20,
            border: "1px solid #E9DFCE",
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 32, color: "#2B2A28", marginBottom: 6 }}>
            Huddle Space
          </div>
          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: "#8A7E72", fontSize: 14, marginBottom: 28 }}>
            A closed feed for people who already know each other.
          </div>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinHuddle()}
            placeholder="What's your name?"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #E9DFCE",
              background: "#fff",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 15,
              marginBottom: 14,
              outline: "none",
            }}
          />
          <button
            onClick={joinHuddle}
            disabled={!nameInput.trim()}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "none",
              background: nameInput.trim() ? "#A65D56" : "#E9DFCE",
              color: "#F6F1E7",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontWeight: 600,
              fontSize: 15,
              cursor: nameInput.trim() ? "pointer" : "default",
            }}
          >
            Join the huddle
          </button>
        </div>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <div style={{ display: "flex", maxWidth: 780, margin: "0 auto", gap: 24, padding: "32px 16px" }}>
        <div style={{ width: 64, flexShrink: 0, paddingTop: 6 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 10 }}>
            <Users size={16} color="#8A7E72" />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8A7E72" }}>{memberNames.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {memberNames.map((n) => (
              <div
                key={n}
                title={n === profile.name ? `${n} (you)` : `Message ${n}`}
                onClick={() => openConversation(n)}
                style={{ cursor: n === profile.name ? "default" : "pointer", opacity: n === profile.name ? 0.55 : 1 }}
              >
                <Avatar name={n} size={32} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 28, color: "#2B2A28" }}>Huddle Space</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                onClick={() => {
                  setDmWith(null);
                  setDmPanelOpen(true);
                }}
                title="Messages"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8A7E72" }}
              >
                <Mail size={17} />
              </button>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#8A7E72" }}>hi, {profile.name}</div>
            </div>
          </div>

          <div style={{ background: "#F6F1E7", border: "1px solid #E9DFCE", borderRadius: 18, padding: "20px 20px 16px", marginBottom: 28 }}>
            <div style={{ display: "flex", marginBottom: 14, marginLeft: 8 }}>
              {memberNames.slice(0, 6).map((n, i) => (
                <div
                  key={n}
                  onClick={() => openConversation(n)}
                  title={n === profile.name ? `${n} (you)` : `Message ${n}`}
                  style={{ marginLeft: -8, transform: `rotate(${(i % 3) - 1}deg)`, zIndex: 6 - i, cursor: n === profile.name ? "default" : "pointer" }}
                >
                  <Avatar name={n} size={30} />
                </div>
              ))}
              {memberNames.length > 6 && (
                <div
                  style={{
                    marginLeft: -8,
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "#E9DFCE",
                    color: "#8A7E72",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontFamily: "'IBM Plex Mono', monospace",
                    border: "2px solid #F6F1E7",
                  }}
                >
                  +{memberNames.length - 6}
                </div>
              )}
            </div>
            <textarea
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              placeholder="What's going on?"
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                resize: "none",
                border: "none",
                background: "transparent",
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 15,
                color: "#2B2A28",
                outline: "none",
              }}
            />
            {composeImage && (
              <div style={{ position: "relative", marginTop: 8, display: "inline-block" }}>
                <img src={composeImage.previewUrl} alt="Selected" style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 10, display: "block" }} />
                <button
                  onClick={() => setComposeImage(null)}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(43,42,40,0.7)",
                    color: "#F6F1E7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {imageError && (
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#A65D56", marginTop: 6 }}>{imageError}</div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={imageProcessing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "none",
                  border: "none",
                  color: "#8A7E72",
                  cursor: imageProcessing ? "default" : "pointer",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13,
                  padding: "6px 8px",
                }}
              >
                <ImageIcon size={16} /> {imageProcessing ? "Processing…" : "Photo"}
              </button>
              <button
                onClick={sharePost}
                disabled={!composeText.trim() || posting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 18px",
                  borderRadius: 999,
                  border: "none",
                  background: composeText.trim() ? "#A65D56" : "#E9DFCE",
                  color: "#F6F1E7",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: composeText.trim() ? "pointer" : "default",
                }}
              >
                {posting ? "Sharing…" : "Share"} <Send size={13} />
              </button>
            </div>
          </div>

          {posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#8A7E72", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
              Nobody's posted yet. Be the first to say something.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {posts.map((p) => {
                const reactions = p.reactions || {};
                const reactionEntries = Object.entries(reactions).filter(([, names]) => names.length > 0);
                const totalReactions = reactionEntries.reduce((sum, [, names]) => sum + names.length, 0);
                const myReaction = reactionEntries.find(([, names]) => names.includes(profile.name))?.[0] || null;
                const pickerOpen = reactionPickerOpen[p.id];
                const commentsOpen = openComments[p.id];
                return (
                  <div key={p.id} style={{ background: "#fff", border: "1px solid #E9DFCE", borderRadius: 16, padding: 18 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                      <Avatar name={p.author} size={38} />
                      <div>
                        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 14, color: "#2B2A28" }}>{p.author}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8A7E72" }}>{timeAgo(p.timestamp)}</div>
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        fontSize: 15,
                        color: "#2B2A28",
                        lineHeight: 1.5,
                        marginBottom: p.imageUrl ? 12 : 4,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {p.text}
                    </div>
                    {p.imageUrl && (
                      <img src={p.imageUrl} alt="" style={{ width: "100%", borderRadius: 12, marginBottom: 10, display: "block" }} onError={(e) => (e.target.style.display = "none")} />
                    )}
                    {reactionEntries.length > 0 && (
                      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        {reactionEntries.map(([emoji, names]) => (
                          <div
                            key={emoji}
                            title={names.join(", ")}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              background: "#F6F1E7",
                              border: myReaction === emoji ? "1px solid #A65D56" : "1px solid #E9DFCE",
                              borderRadius: 999,
                              padding: "2px 8px",
                              fontSize: 12,
                              fontFamily: "'IBM Plex Mono', monospace",
                              color: "#2B2A28",
                            }}
                          >
                            <span>{emoji}</span>
                            <span>{names.length}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 18, marginTop: 8, paddingTop: 10, borderTop: "1px solid #F0EBE0", alignItems: "center" }}>
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={() => setReactionPickerOpen((o) => ({ ...o, [p.id]: !o[p.id] }))}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: myReaction ? "#A65D56" : "#8A7E72",
                            fontFamily: "'IBM Plex Sans', sans-serif",
                            fontSize: 13,
                          }}
                        >
                          {myReaction ? <span style={{ fontSize: 16 }}>{myReaction}</span> : <Smile size={16} />}
                          {totalReactions > 0 ? totalReactions : ""} React
                        </button>
                        {pickerOpen && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: "calc(100% + 8px)",
                              left: 0,
                              background: "#fff",
                              border: "1px solid #E9DFCE",
                              borderRadius: 999,
                              padding: "6px 8px",
                              display: "flex",
                              gap: 6,
                              boxShadow: "0 4px 16px rgba(43,42,40,0.12)",
                              zIndex: 10,
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
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setOpenComments((o) => ({ ...o, [p.id]: !o[p.id] }))}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#8A7E72", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13 }}
                      >
                        <MessageCircle size={16} />
                        {p.comments.length > 0 ? p.comments.length : ""} Comment{p.comments.length === 1 ? "" : "s"}
                      </button>
                    </div>
                    {commentsOpen && (
                      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                        {p.comments.map((c, i) => (
                          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <Avatar name={c.author} size={26} />
                            <div style={{ background: "#F6F1E7", borderRadius: 12, padding: "6px 12px", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#2B2A28" }}>
                              <span style={{ fontWeight: 600 }}>{c.author}</span> {c.text}
                            </div>
                          </div>
                        ))}
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <input
                            value={commentDrafts[p.id] || ""}
                            onChange={(e) => setCommentDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && addComment(p.id)}
                            placeholder="Write a comment…"
                            style={{ flex: 1, padding: "8px 12px", borderRadius: 999, border: "1px solid #E9DFCE", background: "#F6F1E7", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {dmPanelOpen && (
        <div onClick={() => setDmPanelOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(43,42,40,0.35)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 360, maxWidth: "92vw", height: "100%", background: "#F6F1E7", boxShadow: "-6px 0 24px rgba(43,42,40,0.15)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", borderBottom: "1px solid #E9DFCE" }}>
              {dmWith ? (
                <button onClick={() => setDmWith(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8A7E72", padding: 0 }}>
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <Mail size={18} color="#8A7E72" />
              )}
              <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 18, color: "#2B2A28", flex: 1 }}>{dmWith || "Messages"}</div>
              <button onClick={() => setDmPanelOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8A7E72", padding: 0 }}>
                <X size={18} />
              </button>
            </div>

            {!dmWith ? (
              <div style={{ overflowY: "auto", flex: 1 }}>
                {memberNames.filter((n) => n !== profile.name).length === 0 ? (
                  <div style={{ padding: 24, color: "#8A7E72", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, textAlign: "center" }}>Nobody else has joined yet.</div>
                ) : (
                  memberNames
                    .filter((n) => n !== profile.name)
                    .map((n) => (
                      <div key={n} onClick={() => openConversation(n)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", cursor: "pointer", borderBottom: "1px solid #F0EBE0" }}>
                        <Avatar name={n} size={34} />
                        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: "#2B2A28" }}>{n}</div>
                      </div>
                    ))
                )}
              </div>
            ) : (
              <>
                <div ref={dmScrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {dmMessages.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#8A7E72", fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif", marginTop: 20 }}>No messages yet. Say hi to {dmWith}.</div>
                  ) : (
                    dmMessages.map((m, i) => {
                      const mine = m.from === profile.name;
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                          <div
                            style={{
                              maxWidth: "78%",
                              background: mine ? "#A65D56" : "#fff",
                              color: mine ? "#F6F1E7" : "#2B2A28",
                              border: mine ? "none" : "1px solid #E9DFCE",
                              borderRadius: 14,
                              padding: "8px 12px",
                              fontFamily: "'IBM Plex Sans', sans-serif",
                              fontSize: 13.5,
                              lineHeight: 1.4,
                            }}
                          >
                            {m.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid #E9DFCE" }}>
                  <input
                    value={dmDraft}
                    onChange={(e) => setDmDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendDm()}
                    placeholder="Write a message…"
                    style={{ flex: 1, padding: "9px 12px", borderRadius: 999, border: "1px solid #E9DFCE", background: "#fff", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none" }}
                  />
                  <button
                    onClick={sendDm}
                    disabled={!dmDraft.trim()}
                    style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: dmDraft.trim() ? "#A65D56" : "#E9DFCE", color: "#F6F1E7", display: "flex", alignItems: "center", justifyContent: "center", cursor: dmDraft.trim() ? "pointer" : "default", flexShrink: 0 }}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Wrap>
  );
}

function Wrap({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F0EBE0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;1,500&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; }
        body { margin: 0; }
        input::placeholder, textarea::placeholder { color: #B7ADA0; }
      `}</style>
      {children}
    </div>
  );
}
