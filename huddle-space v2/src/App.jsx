import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, MessageCircle, Image as ImageIcon, Send, Users, X, Smile, Mail, ArrowLeft, Bell } from "lucide-react";
import { db } from "./firebase";
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
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";


const AVATAR_COLORS = ["#A65D56", "#C98C82", "#8A7E72", "#B08968", "#6E7B6B", "#9C6644"];
const REACTIONS = ["❤️", "😂", "👍", "😮", "😢"];
const PROFILE_KEY = "huddle-space-profile";

function colorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function compressImageFile(file, maxDim = 800, quality = 0.6) {
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
        resolve(canvas.toDataURL("image/jpeg", quality));
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
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [profileName, setProfileName] = useState(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [feedFilter, setFeedFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [membersDirectoryOpen, setMembersDirectoryOpen] = useState(false);
  const [profileListView, setProfileListView] = useState(null);
  const [reactionListOpen, setReactionListOpen] = useState(null);
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
      snap.forEach((d) => {
        const data = d.data();
        next[d.id] = { bio: "", following: [], ...data };
      });
      setMembers(next);
    });
    return () => unsub();
  }, []);

  // Notifications: realtime listener for this user (sorted client-side to avoid needing a composite index)
  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, "notifications"), where("to", "==", profile.name));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...data };
      });
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setNotifications(list);
    });
    return () => unsub();
  }, [profile]);

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
    setDoc(doc(db, "members", name), { joinedAt: Date.now(), bio: "", following: [] });
    Object.keys(members).forEach((n) => {
      addDoc(collection(db, "notifications"), {
        to: n,
        type: "join",
        from: name,
        message: `${name} joined Huddle Space`,
        timestamp: Date.now(),
        read: false,
      });
    });
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
      const dataUrl = await compressImageFile(file);
      if (dataUrl.length > 700 * 1024) {
        setImageError("That photo is too large even after compressing. Try a smaller one.");
      } else {
        setComposeImage(dataUrl);
      }
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
      await addDoc(collection(db, "posts"), {
        author: profile.name,
        text,
        imageUrl: composeImage || null,
        timestamp: serverTimestamp(),
        reactions: {},
        comments: [],
      });
      memberNames
        .filter((n) => n !== profile.name && (members[n]?.following || []).includes(profile.name))
        .forEach((n) => {
          addDoc(collection(db, "notifications"), {
            to: n,
            type: "post",
            from: profile.name,
            message: `${profile.name} posted something new`,
            timestamp: Date.now(),
            read: false,
          });
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

  function openProfile(name) {
    if (!name) return;
    setProfileName(name);
    setProfilePanelOpen(true);
    setEditingBio(false);
    setProfileListView(null);
  }

  async function toggleFollow(targetName) {
    const myFollowing = members[profile.name]?.following || [];
    const isFollowing = myFollowing.includes(targetName);
    setMembers((prev) => {
      const mine = prev[profile.name] || { bio: "", following: [] };
      const nextFollowing = isFollowing
        ? (mine.following || []).filter((n) => n !== targetName)
        : [...(mine.following || []), targetName];
      return { ...prev, [profile.name]: { ...mine, following: nextFollowing } };
    });
    try {
      await setDoc(
        doc(db, "members", profile.name),
        { following: isFollowing ? arrayRemove(targetName) : arrayUnion(targetName) },
        { merge: true }
      );
    } catch (err) {
      console.error("Follow write failed", err);
    }
    if (!isFollowing) {
      addDoc(collection(db, "notifications"), {
        to: targetName,
        type: "follow",
        from: profile.name,
        message: `${profile.name} started following you`,
        timestamp: Date.now(),
        read: false,
      });
    }
  }

  function markNotificationsRead() {
    notifications.filter((n) => !n.read).forEach((n) => {
      updateDoc(doc(db, "notifications", n.id), { read: true });
    });
  }

  function handleNotifClick(n) {
    setNotifPanelOpen(false);
    if (n.type === "dm") openConversation(n.from);
    else openProfile(n.from);
  }

  function startEditBio() {
    setBioDraft(members[profile.name]?.bio || "");
    setEditingBio(true);
  }

  async function saveBio() {
    await setDoc(doc(db, "members", profile.name), { bio: bioDraft.trim() }, { merge: true });
    setEditingBio(false);
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
    addDoc(collection(db, "notifications"), {
      to: dmWith,
      type: "dm",
      from: profile.name,
      message: `${profile.name} sent you a message`,
      timestamp: Date.now(),
      read: false,
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
      <div className="hs-layout" style={{ display: "flex", gap: 24, maxWidth: 780, margin: "0 auto", padding: "32px 16px" }}>
        <div className="hs-rail" style={{ width: 64, flexShrink: 0, paddingTop: 6 }}>
          <div
            onClick={() => setMembersDirectoryOpen(true)}
            title="See everyone on Huddle Space"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 10, cursor: "pointer" }}
          >
            <Users size={16} color="#8A7E72" />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8A7E72" }}>{memberNames.length}</span>
          </div>
          <div className="hs-rail-avatars" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {memberNames.map((n) => (
              <div
                key={n}
                title={n === profile.name ? `${n} (you)` : `View ${n}'s profile`}
                onClick={() => openProfile(n)}
                style={{ cursor: "pointer", opacity: n === profile.name ? 0.55 : 1 }}
              >
                <Avatar name={n} size={32} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 28, color: "#2B2A28" }}>Huddle Space</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    setNotifPanelOpen((o) => {
                      if (!o) markNotificationsRead();
                      return !o;
                    });
                  }}
                  title="Notifications"
                  className="hs-icon-btn"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#8A7E72", position: "relative", width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Bell size={18} />
                  {notifications.some((n) => !n.read) && (
                    <span
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 7,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#A65D56",
                        border: "1px solid #F6F1E7",
                      }}
                    />
                  )}
                </button>
                {notifPanelOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      right: 0,
                      width: 300,
                      maxHeight: 380,
                      overflowY: "auto",
                      background: "#fff",
                      border: "1px solid #E9DFCE",
                      borderRadius: 14,
                      boxShadow: "0 8px 24px rgba(43,42,40,0.15)",
                      zIndex: 70,
                    }}
                  >
                    {notifications.length === 0 ? (
                      <div style={{ padding: 20, textAlign: "center", color: "#8A7E72", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13 }}>
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          style={{
                            padding: "12px 14px",
                            borderBottom: "1px solid #F0EBE0",
                            cursor: "pointer",
                            background: n.read ? "transparent" : "#F6F1E7",
                          }}
                        >
                          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#2B2A28" }}>{n.message}</div>
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8A7E72", marginTop: 2 }}>{timeAgo(n.timestamp)}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setDmWith(null);
                  setDmPanelOpen(true);
                }}
                title="Messages"
                className="hs-icon-btn"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8A7E72", width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Mail size={18} />
              </button>
              <div
                onClick={() => openProfile(profile.name)}
                style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#8A7E72", cursor: "pointer", marginLeft: 4 }}
              >
                hi, {profile.name}
              </div>
            </div>
          </div>

          <div style={{ background: "#F6F1E7", border: "1px solid #E9DFCE", borderRadius: 18, padding: "20px 20px 16px", marginBottom: 28 }}>
            <div style={{ display: "flex", marginBottom: 14, marginLeft: 8 }}>
              {memberNames.slice(0, 6).map((n, i) => (
                <div
                  key={n}
                  onClick={() => openProfile(n)}
                  title={n === profile.name ? `${n} (you)` : `View ${n}'s profile`}
                  style={{ marginLeft: -8, transform: `rotate(${(i % 3) - 1}deg)`, zIndex: 6 - i, cursor: "pointer" }}
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
                <img src={composeImage} alt="Selected" style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 10, display: "block" }} />
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

          {(() => {
            const myFollowing = members[profile.name]?.following || [];
            const visiblePosts = feedFilter === "following" ? posts.filter((p) => p.author === profile.name || myFollowing.includes(p.author)) : posts;
            return (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {["all", "following"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFeedFilter(f)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 999,
                        border: feedFilter === f ? "1px solid #A65D56" : "1px solid #E9DFCE",
                        background: feedFilter === f ? "#A65D56" : "transparent",
                        color: feedFilter === f ? "#F6F1E7" : "#8A7E72",
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                {visiblePosts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#8A7E72", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
                    {feedFilter === "following" ? "Nobody you follow has posted yet." : "Nobody's posted yet. Be the first to say something."}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {visiblePosts.map((p) => {
                const reactions = p.reactions || {};
                const reactionEntries = Object.entries(reactions).filter(([, names]) => names.length > 0);
                const totalReactions = reactionEntries.reduce((sum, [, names]) => sum + names.length, 0);
                const myReaction = reactionEntries.find(([, names]) => names.includes(profile.name))?.[0] || null;
                const pickerOpen = reactionPickerOpen[p.id];
                const commentsOpen = openComments[p.id];
                return (
                  <div key={p.id} style={{ background: "#fff", border: "1px solid #E9DFCE", borderRadius: 16, padding: 18 }}>
                    <div
                      onClick={() => openProfile(p.author)}
                      style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10, cursor: "pointer", width: "fit-content" }}
                    >
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
                          <div key={emoji} style={{ position: "relative" }}>
                            <button
                              onClick={() => setReactionListOpen((cur) => (cur?.postId === p.id && cur?.emoji === emoji ? null : { postId: p.id, emoji }))}
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
                                cursor: "pointer",
                              }}
                            >
                              <span>{emoji}</span>
                              <span>{names.length}</span>
                            </button>
                            {reactionListOpen?.postId === p.id && reactionListOpen?.emoji === emoji && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "calc(100% + 6px)",
                                  left: 0,
                                  background: "#fff",
                                  border: "1px solid #E9DFCE",
                                  borderRadius: 10,
                                  padding: "8px 12px",
                                  boxShadow: "0 4px 16px rgba(43,42,40,0.12)",
                                  zIndex: 20,
                                  whiteSpace: "nowrap",
                                  fontFamily: "'IBM Plex Sans', sans-serif",
                                  fontSize: 12,
                                  color: "#2B2A28",
                                }}
                              >
                                {names.map((n, i) => (
                                  <div
                                    key={n}
                                    onClick={() => {
                                      setReactionListOpen(null);
                                      openProfile(n);
                                    }}
                                    style={{ cursor: "pointer", padding: "2px 0" }}
                                  >
                                    {n}
                                  </div>
                                ))}
                              </div>
                            )}
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
              </>
            );
          })()}
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

      {profilePanelOpen && profileName && (() => {
        const targetMember = members[profileName] || {};
        const targetPosts = posts.filter((p) => p.author === profileName);
        const postCount = targetPosts.length;
        const reactionsReceived = targetPosts.reduce(
          (sum, p) => sum + Object.values(p.reactions || {}).reduce((s, arr) => s + arr.length, 0),
          0
        );
        const followingList = targetMember.following || [];
        const followingCount = followingList.length;
        const followersList = memberNames.filter((n) => (members[n]?.following || []).includes(profileName));
        const followersCount = followersList.length;
        const isOwnProfile = profileName === profile.name;
        const iFollowThem = (members[profile.name]?.following || []).includes(profileName);
        const listToShow = profileListView === "followers" ? followersList : profileListView === "following" ? followingList : null;

        return (
          <div
            onClick={() => setProfilePanelOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(43,42,40,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: 360, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto", background: "#F6F1E7", borderRadius: 20, padding: "28px 24px", position: "relative" }}
            >
              {listToShow ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <button
                      onClick={() => setProfileListView(null)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#8A7E72", padding: 0 }}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 18, color: "#2B2A28" }}>
                      {profileListView === "followers" ? "Followers" : "Following"}
                    </div>
                  </div>
                  {listToShow.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#8A7E72", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, padding: "20px 0" }}>
                      {profileListView === "followers" ? "No followers yet." : "Not following anyone yet."}
                    </div>
                  ) : (
                    listToShow.map((n) => (
                      <div
                        key={n}
                        onClick={() => openProfile(n)}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", cursor: "pointer" }}
                      >
                        <Avatar name={n} size={34} />
                        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: "#2B2A28" }}>{n}</div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setProfilePanelOpen(false)}
                    style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#8A7E72" }}
                  >
                    <X size={18} />
                  </button>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                    <Avatar name={profileName} size={64} />
                    <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 22, color: "#2B2A28", marginTop: 12 }}>
                      {profileName}
                      {isOwnProfile && <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontStyle: "normal", fontSize: 12, color: "#8A7E72" }}> (you)</span>}
                    </div>

                    {editingBio ? (
                      <div style={{ width: "100%", marginTop: 12 }}>
                        <textarea
                          value={bioDraft}
                          onChange={(e) => setBioDraft(e.target.value)}
                          placeholder="Write a short bio…"
                          rows={3}
                          maxLength={160}
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: "1px solid #E9DFCE",
                            fontFamily: "'IBM Plex Sans', sans-serif",
                            fontSize: 13,
                            resize: "none",
                            outline: "none",
                          }}
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "center" }}>
                          <button
                            onClick={() => setEditingBio(false)}
                            style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid #E9DFCE", background: "transparent", color: "#8A7E72", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, cursor: "pointer" }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveBio}
                            style={{ padding: "6px 14px", borderRadius: 999, border: "none", background: "#A65D56", color: "#F6F1E7", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: targetMember.bio ? "#2B2A28" : "#B7ADA0", marginTop: 8, lineHeight: 1.5 }}>
                        {targetMember.bio || (isOwnProfile ? "No bio yet — add one below." : "No bio yet.")}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 18, marginTop: 18, paddingTop: 16, borderTop: "1px solid #E9DFCE", width: "100%", justifyContent: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#2B2A28" }}>{postCount}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8A7E72" }}>Posts</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#2B2A28" }}>{reactionsReceived}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8A7E72" }}>Reactions</div>
                      </div>
                      <div style={{ textAlign: "center", cursor: "pointer" }} onClick={() => setProfileListView("followers")}>
                        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#2B2A28" }}>{followersCount}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8A7E72", textDecoration: "underline" }}>Followers</div>
                      </div>
                      <div style={{ textAlign: "center", cursor: "pointer" }} onClick={() => setProfileListView("following")}>
                        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#2B2A28" }}>{followingCount}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8A7E72", textDecoration: "underline" }}>Following</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                      {isOwnProfile ? (
                        !editingBio && (
                          <button
                            onClick={startEditBio}
                            style={{ padding: "8px 16px", borderRadius: 999, border: "1px solid #E9DFCE", background: "transparent", color: "#2B2A28", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                          >
                            Edit bio
                          </button>
                        )
                      ) : (
                        <>
                          <button
                            onClick={() => toggleFollow(profileName)}
                            style={{
                              padding: "8px 16px",
                              borderRadius: 999,
                              border: iFollowThem ? "1px solid #E9DFCE" : "none",
                              background: iFollowThem ? "transparent" : "#A65D56",
                              color: iFollowThem ? "#2B2A28" : "#F6F1E7",
                              fontFamily: "'IBM Plex Sans', sans-serif",
                              fontWeight: 600,
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            {iFollowThem ? "Following" : "Follow"}
                          </button>
                          <button
                            onClick={() => {
                              setProfilePanelOpen(false);
                              openConversation(profileName);
                            }}
                            style={{ padding: "8px 16px", borderRadius: 999, border: "1px solid #E9DFCE", background: "transparent", color: "#2B2A28", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                          >
                            Message
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {membersDirectoryOpen && (
        <div
          onClick={() => setMembersDirectoryOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(43,42,40,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 360, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto", background: "#F6F1E7", borderRadius: 20, padding: "24px", position: "relative" }}
          >
            <button
              onClick={() => setMembersDirectoryOpen(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#8A7E72" }}
            >
              <X size={18} />
            </button>
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 20, color: "#2B2A28", marginBottom: 16 }}>
              Everyone on Huddle Space ({memberNames.length})
            </div>
            {memberNames.map((n) => (
              <div
                key={n}
                onClick={() => {
                  setMembersDirectoryOpen(false);
                  openProfile(n);
                }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", cursor: "pointer" }}
              >
                <Avatar name={n} size={34} />
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: "#2B2A28" }}>
                  {n}
                  {n === profile.name && <span style={{ color: "#8A7E72" }}> (you)</span>}
                </div>
              </div>
            ))}
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
        .hs-icon-btn { transition: background 0.15s ease; }
        .hs-icon-btn:hover { background: #EFE8DA; }

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
