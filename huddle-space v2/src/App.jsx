import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, MessageCircle, Image as ImageIcon, Send, Users, X, Smile, Mail, ArrowLeft, Bell, Trash2, Camera, Pencil, Flag, Pin, BarChart3, Shield } from "lucide-react";
import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";


const AVATAR_COLORS = ["#FF8A4C", "#C98C82", "#8B8B93", "#B08968", "#6E7B6B", "#9C6644"];
const REACTIONS = ["❤️", "😂", "👍", "😮", "😢"];
const PROFILE_KEY = "huddle-space-profile";
const ADMIN_NAMES = ["John#6"];

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

function extractMentionedNames(text, memberNames) {
  if (!text) return [];
  return memberNames.filter((n) => text.includes("@" + n));
}

function renderWithMentions(text, memberNames, onClickName) {
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

function Avatar({ name, size = 36, photoURL, online }) {
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
        background: colorFor(name || ""),
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

function Logo({ size = 28 }) {
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

export default function App() {
  const [profile, setProfile] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [members, setMembers] = useState({});
  const [posts, setPosts] = useState([]);
  const [composeText, setComposeText] = useState("");
  const [composeImage, setComposeImage] = useState(null); // { blob, previewUrl }
  const [pollMode, setPollMode] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [reports, setReports] = useState([]);
  const [reportsPanelOpen, setReportsPanelOpen] = useState(false);
  const [openComments, setOpenComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [posting, setPosting] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [imageError, setImageError] = useState("");
  const [reactionPickerOpen, setReactionPickerOpen] = useState({});
  const [customEmoji, setCustomEmoji] = useState("");
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
  const avatarFileInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

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

  // Presence: heartbeat marks you active; other members read this to show an online dot
  useEffect(() => {
    if (!profile) return;
    const beat = () => setDoc(doc(db, "members", profile.name), { lastActive: Date.now() }, { merge: true });
    beat();
    const interval = setInterval(beat, 45000);
    const onVisible = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [profile]);

  // Ticks periodically so "online" status re-evaluates even without new Firestore events
  const [presenceTick, setPresenceTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setPresenceTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  function isOnline(name) {
    void presenceTick;
    const t = members[name]?.lastActive;
    return !!t && Date.now() - t < 90000;
  }

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

  // Reports: realtime listener, admin-only
  useEffect(() => {
    if (!profile || !ADMIN_NAMES.includes(profile.name)) return;
    const unsub = onSnapshot(collection(db, "reports"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setReports(list);
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
    const validPollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    const isValidPoll = pollMode && pollQuestion.trim() && validPollOptions.length >= 2;
    if (!text && !isValidPoll) return;
    setPosting(true);
    try {
      await addDoc(collection(db, "posts"), {
        author: profile.name,
        text,
        imageUrl: composeImage || null,
        timestamp: serverTimestamp(),
        reactions: {},
        comments: [],
        pinned: false,
        poll: isValidPoll
          ? { question: pollQuestion.trim(), options: validPollOptions.map((o) => ({ text: o, votes: [] })) }
          : null,
      });
      const mentioned = extractMentionedNames(text, memberNames);
      memberNames
        .filter((n) => n !== profile.name && ((members[n]?.following || []).includes(profile.name) || mentioned.includes(n)))
        .forEach((n) => {
          addDoc(collection(db, "notifications"), {
            to: n,
            type: mentioned.includes(n) ? "mention" : "post",
            from: profile.name,
            message: mentioned.includes(n) ? `${profile.name} mentioned you in a post` : `${profile.name} posted something new`,
            timestamp: Date.now(),
            read: false,
          });
        });
      setComposeText("");
      setComposeImage(null);
      setImageError("");
      setPollMode(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
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
    if (!alreadyHadThis && post.author !== profile.name) {
      addDoc(collection(db, "notifications"), {
        to: post.author,
        type: "post",
        from: profile.name,
        message: `${profile.name} reacted ${emoji} to your post`,
        timestamp: Date.now(),
        read: false,
      });
    }
  }

  async function addComment(postId) {
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const nextComments = [...(post.comments || []), { author: profile.name, text, timestamp: Date.now() }];
    setCommentDrafts((d) => ({ ...d, [postId]: "" }));
    await updateDoc(doc(db, "posts", postId), { comments: nextComments });
    if (post.author !== profile.name) {
      addDoc(collection(db, "notifications"), {
        to: post.author,
        type: "post",
        from: profile.name,
        message: `${profile.name} commented on your post`,
        timestamp: Date.now(),
        read: false,
      });
    }
    extractMentionedNames(text, memberNames)
      .filter((n) => n !== profile.name && n !== post.author)
      .forEach((n) => {
        addDoc(collection(db, "notifications"), {
          to: n,
          type: "mention",
          from: profile.name,
          message: `${profile.name} mentioned you in a comment`,
          timestamp: Date.now(),
          read: false,
        });
      });
  }

  async function votePoll(postId, optionIndex) {
    const post = posts.find((p) => p.id === postId);
    if (!post?.poll) return;
    const alreadyVotedThis = (post.poll.options[optionIndex]?.votes || []).includes(profile.name);
    const options = post.poll.options.map((opt, i) => {
      const votes = (opt.votes || []).filter((n) => n !== profile.name);
      if (i === optionIndex && !alreadyVotedThis) votes.push(profile.name);
      return { ...opt, votes };
    });
    await updateDoc(doc(db, "posts", postId), { poll: { ...post.poll, options } });
  }

  function startEditPost(post) {
    setEditingPostId(post.id);
    setEditDraft(post.text || "");
  }

  function cancelEditPost() {
    setEditingPostId(null);
    setEditDraft("");
  }

  async function saveEditPost(postId) {
    const text = editDraft.trim();
    if (!text) return;
    await updateDoc(doc(db, "posts", postId), { text, edited: true, editedAt: Date.now() });
    setEditingPostId(null);
  }

  async function reportPost(post) {
    const confirmed = window.confirm("Report this post to the admins for review?");
    if (!confirmed) return;
    await addDoc(collection(db, "reports"), {
      postId: post.id,
      postAuthor: post.author,
      postTextSnippet: (post.text || "(photo/poll only)").slice(0, 140),
      reportedBy: profile.name,
      timestamp: Date.now(),
      resolved: false,
    });
    ADMIN_NAMES.forEach((admin) => {
      addDoc(collection(db, "notifications"), {
        to: admin,
        type: "report",
        from: profile.name,
        message: `${profile.name} reported a post by ${post.author}`,
        timestamp: Date.now(),
        read: false,
      });
    });
  }

  async function togglePin(postId, currentlyPinned) {
    await updateDoc(doc(db, "posts", postId), { pinned: !currentlyPinned });
  }

  async function dismissReport(reportId) {
    await updateDoc(doc(db, "reports", reportId), { resolved: true });
  }

  async function deletePost(postId, author) {
    const isAdmin = ADMIN_NAMES.includes(profile.name);
    if (author !== profile.name && !isAdmin) return;
    const message = author === profile.name ? "Delete this post? This can't be undone." : `Delete ${author}'s post as an admin? This can't be undone.`;
    const confirmed = window.confirm(message);
    if (!confirmed) return;
    await deleteDoc(doc(db, "posts", postId));
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
    else if (n.type === "report") setReportsPanelOpen(true);
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

  async function handleAvatarSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setAvatarUploading(true);
    try {
      const dataUrl = await compressImageFile(file, 300, 0.7);
      await setDoc(doc(db, "members", profile.name), { photoURL: dataUrl }, { merge: true });
    } catch (err) {
      console.error("Avatar upload failed", err);
    } finally {
      setAvatarUploading(false);
    }
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
            background: "#1C1C1F",
            borderRadius: 20,
            border: "1px solid #2E2E33",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
            <Logo size={30} />
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 32, color: "#EDEDEF" }}>Huddle Space</div>
          </div>
          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: "#8B8B93", fontSize: 14, marginBottom: 28 }}>
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
              border: "1px solid #2E2E33",
              background: "#1C1C1F",
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
              background: nameInput.trim() ? "#FF8A4C" : "#2E2E33",
              color: "#16161A",
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

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Logo size={24} />
              <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 28, color: "#EDEDEF" }}>Huddle Space</div>
            </div>
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
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", position: "relative", width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
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
                        background: "#FF8A4C",
                        border: "1px solid #16161A",
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
                      background: "#1C1C1F",
                      border: "1px solid #2E2E33",
                      borderRadius: 14,
                      boxShadow: "0 8px 24px rgba(43,42,40,0.15)",
                      zIndex: 70,
                    }}
                  >
                    {notifications.length === 0 ? (
                      <div style={{ padding: 20, textAlign: "center", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13 }}>
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          style={{
                            padding: "12px 14px",
                            borderBottom: "1px solid #2A2A2D",
                            cursor: "pointer",
                            background: n.read ? "transparent" : "rgba(255,138,76,0.10)",
                          }}
                        >
                          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#EDEDEF" }}>{n.message}</div>
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93", marginTop: 2 }}>{timeAgo(n.timestamp)}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {ADMIN_NAMES.includes(profile.name) && (
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setReportsPanelOpen(true)}
                    title="Reports (admin)"
                    className="hs-icon-btn"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
                  >
                    <Shield size={18} />
                    {reports.some((r) => !r.resolved && posts.some((p) => p.id === r.postId)) && (
                      <span
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 7,
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#FF8A4C",
                          border: "1px solid #1C1C1F",
                        }}
                      />
                    )}
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  setDmWith(null);
                  setDmPanelOpen(true);
                }}
                title="Messages"
                className="hs-icon-btn"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Mail size={18} />
              </button>
              <div
                onClick={() => openProfile(profile.name)}
                style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#8B8B93", cursor: "pointer", marginLeft: 4 }}
              >
                hi, {profile.name}
              </div>
            </div>
          </div>

          <div style={{ background: "#1C1C1F", border: "1px solid #2E2E33", borderRadius: 18, padding: "20px 20px 16px", marginBottom: 28 }}>
            <div style={{ display: "flex", marginBottom: 14, marginLeft: 8 }}>
              {memberNames.slice(0, 6).map((n, i) => (
                <div
                  key={n}
                  onClick={() => openProfile(n)}
                  title={n === profile.name ? `${n} (you)` : `View ${n}'s profile`}
                  style={{ marginLeft: -8, transform: `rotate(${(i % 3) - 1}deg)`, zIndex: 6 - i, cursor: "pointer" }}
                >
                  <Avatar name={n} size={30} photoURL={members[n]?.photoURL} online={isOnline(n)} />
                </div>
              ))}
              {memberNames.length > 6 && (
                <div
                  style={{
                    marginLeft: -8,
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "#2E2E33",
                    color: "#8B8B93",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontFamily: "'IBM Plex Mono', monospace",
                    border: "2px solid #16161A",
                  }}
                >
                  +{memberNames.length - 6}
                </div>
              )}
            </div>
            <textarea
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              placeholder={pollMode ? "Add a caption (optional)" : "What's going on? Tip: @Name to mention someone"}
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                resize: "none",
                border: "none",
                background: "transparent",
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 15,
                color: "#EDEDEF",
                outline: "none",
              }}
            />
            {pollMode && (
              <div style={{ background: "#16161A", border: "1px solid #2E2E33", borderRadius: 12, padding: 12, marginTop: 4 }}>
                <input
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Ask a question…"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #2E2E33",
                    background: "#1C1C1F",
                    color: "#EDEDEF",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 13,
                    outline: "none",
                    marginBottom: 8,
                  }}
                />
                {pollOptions.map((opt, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <input
                      value={opt}
                      onChange={(e) =>
                        setPollOptions((opts) => opts.map((o, oi) => (oi === i ? e.target.value : o)))
                      }
                      placeholder={`Option ${i + 1}`}
                      style={{
                        flex: 1,
                        boxSizing: "border-box",
                        padding: "7px 10px",
                        borderRadius: 8,
                        border: "1px solid #2E2E33",
                        background: "#1C1C1F",
                        color: "#EDEDEF",
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => setPollOptions((opts) => opts.filter((_, oi) => oi !== i))}
                        style={{ background: "none", border: "none", color: "#5C5C63", cursor: "pointer" }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  {pollOptions.length < 6 ? (
                    <button
                      onClick={() => setPollOptions((opts) => [...opts, ""])}
                      style={{ background: "none", border: "none", color: "#8B8B93", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12 }}
                    >
                      + Add option
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={() => {
                      setPollMode(false);
                      setPollQuestion("");
                      setPollOptions(["", ""]);
                    }}
                    style={{ background: "none", border: "none", color: "#5C5C63", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12 }}
                  >
                    Cancel poll
                  </button>
                </div>
              </div>
            )}
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
                    color: "#16161A",
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
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#FF8A4C", marginTop: 6 }}>{imageError}</div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageProcessing}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    color: "#8B8B93",
                    cursor: imageProcessing ? "default" : "pointer",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 13,
                    padding: "6px 8px",
                  }}
                >
                  <ImageIcon size={16} /> {imageProcessing ? "Processing…" : "Photo"}
                </button>
                <button
                  onClick={() => setPollMode((v) => !v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    color: pollMode ? "#FF8A4C" : "#8B8B93",
                    cursor: "pointer",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 13,
                    padding: "6px 8px",
                  }}
                >
                  <BarChart3 size={16} /> Poll
                </button>
              </div>
              <button
                onClick={sharePost}
                disabled={(!composeText.trim() && !(pollMode && pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2)) || posting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 18px",
                  borderRadius: 999,
                  border: "none",
                  background:
                    composeText.trim() || (pollMode && pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2)
                      ? "#FF8A4C"
                      : "#2E2E33",
                  color: "#16161A",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor:
                    composeText.trim() || (pollMode && pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2)
                      ? "pointer"
                      : "default",
                }}
              >
                {posting ? "Sharing…" : "Share"} <Send size={13} />
              </button>
            </div>
          </div>

          {(() => {
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
                        padding: "6px 14px",
                        borderRadius: 999,
                        border: feedFilter === f ? "1px solid #FF8A4C" : "1px solid #2E2E33",
                        background: feedFilter === f ? "#FF8A4C" : "transparent",
                        color: feedFilter === f ? "#16161A" : "#8B8B93",
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
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
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
                  <div key={p.id} style={{ background: "#1C1C1F", border: p.pinned ? "1px solid #FF8A4C" : "1px solid #2E2E33", borderRadius: 16, padding: 18 }}>
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
                          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 14, color: "#EDEDEF" }}>{p.author}</div>
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8B93" }}>
                            {timeAgo(p.timestamp)}
                            {p.edited && " · edited"}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        {ADMIN_NAMES.includes(profile.name) && (
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
                        {(p.author === profile.name || ADMIN_NAMES.includes(profile.name)) && (
                          <button
                            onClick={() => deletePost(p.id, p.author)}
                            title={p.author === profile.name ? "Delete post" : "Delete post (admin)"}
                            className="hs-icon-btn"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: p.author === profile.name ? "#5C5C63" : "#FF8A4C",
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
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
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid #2E2E33",
                            background: "#16161A",
                            color: "#EDEDEF",
                            fontFamily: "'IBM Plex Sans', sans-serif",
                            fontSize: 14,
                            resize: "none",
                            outline: "none",
                          }}
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
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
                            fontFamily: "'IBM Plex Sans', sans-serif",
                            fontSize: 15,
                            color: "#EDEDEF",
                            lineHeight: 1.5,
                            marginBottom: p.imageUrl || p.poll ? 12 : 4,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {renderWithMentions(p.text, memberNames, openProfile)}
                        </div>
                      )
                    )}
                    {p.poll && (
                      <div style={{ marginBottom: p.imageUrl ? 12 : 4 }}>
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
                                  position: "relative",
                                  border: iVoted ? "1px solid #FF8A4C" : "1px solid #2E2E33",
                                  borderRadius: 8,
                                  padding: "8px 10px",
                                  marginBottom: 6,
                                  cursor: "pointer",
                                  overflow: "hidden",
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
                                background: "#1C1C1F",
                                border: myReaction === emoji ? "1px solid #FF8A4C" : "1px solid #2E2E33",
                                borderRadius: 999,
                                padding: "2px 8px",
                                fontSize: 12,
                                fontFamily: "'IBM Plex Mono', monospace",
                                color: "#EDEDEF",
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
                                  background: "#1C1C1F",
                                  border: "1px solid #2E2E33",
                                  borderRadius: 10,
                                  padding: "8px 12px",
                                  boxShadow: "0 4px 16px rgba(43,42,40,0.12)",
                                  zIndex: 20,
                                  whiteSpace: "nowrap",
                                  fontFamily: "'IBM Plex Sans', sans-serif",
                                  fontSize: 12,
                                  color: "#EDEDEF",
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
                    <div style={{ display: "flex", gap: 18, marginTop: 8, paddingTop: 10, borderTop: "1px solid #2A2A2D", alignItems: "center" }}>
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
                            color: myReaction ? "#FF8A4C" : "#8B8B93",
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
                              background: "#1C1C1F",
                              border: "1px solid #2E2E33",
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
                                width: 34,
                                textAlign: "center",
                                background: "#16161A",
                                border: "1px solid #2E2E33",
                                borderRadius: 999,
                                color: "#EDEDEF",
                                fontSize: 15,
                                padding: "2px 4px",
                                outline: "none",
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
                              <span style={{ fontWeight: 600 }}>{c.author}</span> {renderWithMentions(c.text, memberNames, openProfile)}
                            </div>
                          </div>
                        ))}
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <input
                            value={commentDrafts[p.id] || ""}
                            onChange={(e) => setCommentDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && addComment(p.id)}
                            placeholder="Write a comment…"
                            style={{ flex: 1, padding: "8px 12px", borderRadius: 999, border: "1px solid #2E2E33", background: "#1C1C1F", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none" }}
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
          <div onClick={(e) => e.stopPropagation()} style={{ width: 360, maxWidth: "92vw", height: "100%", background: "#1C1C1F", boxShadow: "-6px 0 24px rgba(43,42,40,0.15)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", borderBottom: "1px solid #2E2E33" }}>
              {dmWith ? (
                <button onClick={() => setDmWith(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", padding: 0 }}>
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <Mail size={18} color="#8B8B93" />
              )}
              <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 18, color: "#EDEDEF", flex: 1 }}>{dmWith || "Messages"}</div>
              <button onClick={() => setDmPanelOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", padding: 0 }}>
                <X size={18} />
              </button>
            </div>

            {!dmWith ? (
              <div style={{ overflowY: "auto", flex: 1 }}>
                {memberNames.filter((n) => n !== profile.name).length === 0 ? (
                  <div style={{ padding: 24, color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, textAlign: "center" }}>Nobody else has joined yet.</div>
                ) : (
                  memberNames
                    .filter((n) => n !== profile.name)
                    .map((n) => (
                      <div key={n} onClick={() => openConversation(n)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", cursor: "pointer", borderBottom: "1px solid #2A2A2D" }}>
                        <Avatar name={n} size={34} photoURL={members[n]?.photoURL} online={isOnline(n)} />
                        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: "#EDEDEF" }}>{n}</div>
                      </div>
                    ))
                )}
              </div>
            ) : (
              <>
                <div ref={dmScrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {dmMessages.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#8B8B93", fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif", marginTop: 20 }}>No messages yet. Say hi to {dmWith}.</div>
                  ) : (
                    dmMessages.map((m, i) => {
                      const mine = m.from === profile.name;
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                          <div
                            style={{
                              maxWidth: "78%",
                              background: mine ? "#FF8A4C" : "#26262B",
                              color: mine ? "#16161A" : "#EDEDEF",
                              border: mine ? "none" : "1px solid #2E2E33",
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
                <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid #2E2E33" }}>
                  <input
                    value={dmDraft}
                    onChange={(e) => setDmDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendDm()}
                    placeholder="Write a message…"
                    style={{ flex: 1, padding: "9px 12px", borderRadius: 999, border: "1px solid #2E2E33", background: "#1C1C1F", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none" }}
                  />
                  <button
                    onClick={sendDm}
                    disabled={!dmDraft.trim()}
                    style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: dmDraft.trim() ? "#FF8A4C" : "#2E2E33", color: "#16161A", display: "flex", alignItems: "center", justifyContent: "center", cursor: dmDraft.trim() ? "pointer" : "default", flexShrink: 0 }}
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
              style={{ width: 360, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto", background: "#1C1C1F", borderRadius: 20, padding: "28px 24px", position: "relative" }}
            >
              {listToShow ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <button
                      onClick={() => setProfileListView(null)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", padding: 0 }}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 18, color: "#EDEDEF" }}>
                      {profileListView === "followers" ? "Followers" : "Following"}
                    </div>
                  </div>
                  {listToShow.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, padding: "20px 0" }}>
                      {profileListView === "followers" ? "No followers yet." : "Not following anyone yet."}
                    </div>
                  ) : (
                    listToShow.map((n) => (
                      <div
                        key={n}
                        onClick={() => openProfile(n)}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", cursor: "pointer" }}
                      >
                        <Avatar name={n} size={34} photoURL={members[n]?.photoURL} online={isOnline(n)} />
                        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: "#EDEDEF" }}>{n}</div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setProfilePanelOpen(false)}
                    style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#8B8B93" }}
                  >
                    <X size={18} />
                  </button>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                    {isOwnProfile ? (
                      <div
                        onClick={() => !avatarUploading && avatarFileInputRef.current?.click()}
                        style={{ position: "relative", cursor: avatarUploading ? "default" : "pointer", width: 64, height: 64 }}
                        title="Change profile photo"
                      >
                        <Avatar name={profileName} size={64} photoURL={targetMember.photoURL} />
                        <div
                          style={{
                            position: "absolute",
                            bottom: -2,
                            right: -2,
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: "#FF8A4C",
                            border: "2px solid #1C1C1F",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Camera size={12} color="#16161A" />
                        </div>
                        <input ref={avatarFileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: "none" }} />
                      </div>
                    ) : (
                      <Avatar name={profileName} size={64} photoURL={targetMember.photoURL} online={isOnline(profileName)} />
                    )}
                    {avatarUploading && (
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93", marginTop: 4 }}>Uploading…</div>
                    )}
                    <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 22, color: "#EDEDEF", marginTop: 12 }}>
                      {profileName}
                      {isOwnProfile && <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontStyle: "normal", fontSize: 12, color: "#8B8B93" }}> (you)</span>}
                      {ADMIN_NAMES.includes(profileName) && (
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontStyle: "normal",
                            fontSize: 10,
                            color: "#FF8A4C",
                            border: "1px solid #FF8A4C",
                            borderRadius: 999,
                            padding: "2px 8px",
                            marginLeft: 8,
                            verticalAlign: "middle",
                          }}
                        >
                          ADMIN
                        </span>
                      )}
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
                            border: "1px solid #2E2E33",
                            fontFamily: "'IBM Plex Sans', sans-serif",
                            fontSize: 13,
                            resize: "none",
                            outline: "none",
                          }}
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "center" }}>
                          <button
                            onClick={() => setEditingBio(false)}
                            style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid #2E2E33", background: "transparent", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, cursor: "pointer" }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveBio}
                            style={{ padding: "6px 14px", borderRadius: 999, border: "none", background: "#FF8A4C", color: "#16161A", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: targetMember.bio ? "#EDEDEF" : "#5C5C63", marginTop: 8, lineHeight: 1.5 }}>
                        {targetMember.bio || (isOwnProfile ? "No bio yet — add one below." : "No bio yet.")}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 18, marginTop: 18, paddingTop: 16, borderTop: "1px solid #2E2E33", width: "100%", justifyContent: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#EDEDEF" }}>{postCount}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93" }}>Posts</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#EDEDEF" }}>{reactionsReceived}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93" }}>Reactions</div>
                      </div>
                      <div style={{ textAlign: "center", cursor: "pointer" }} onClick={() => setProfileListView("followers")}>
                        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#EDEDEF" }}>{followersCount}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93", textDecoration: "underline" }}>Followers</div>
                      </div>
                      <div style={{ textAlign: "center", cursor: "pointer" }} onClick={() => setProfileListView("following")}>
                        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#EDEDEF" }}>{followingCount}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93", textDecoration: "underline" }}>Following</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                      {isOwnProfile ? (
                        !editingBio && (
                          <button
                            onClick={startEditBio}
                            style={{ padding: "8px 16px", borderRadius: 999, border: "1px solid #2E2E33", background: "transparent", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
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
                              border: iFollowThem ? "1px solid #2E2E33" : "none",
                              background: iFollowThem ? "transparent" : "#FF8A4C",
                              color: iFollowThem ? "#EDEDEF" : "#16161A",
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
                            style={{ padding: "8px 16px", borderRadius: 999, border: "1px solid #2E2E33", background: "transparent", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
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
            style={{ width: 360, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto", background: "#1C1C1F", borderRadius: 20, padding: "24px", position: "relative" }}
          >
            <button
              onClick={() => setMembersDirectoryOpen(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#8B8B93" }}
            >
              <X size={18} />
            </button>
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 20, color: "#EDEDEF", marginBottom: 16 }}>
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
                <Avatar name={n} size={34} photoURL={members[n]?.photoURL} online={isOnline(n)} />
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: "#EDEDEF" }}>
                  {n}
                  {n === profile.name && <span style={{ color: "#8B8B93" }}> (you)</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportsPanelOpen && ADMIN_NAMES.includes(profile.name) && (() => {
        const openReports = reports.filter((r) => !r.resolved && posts.some((p) => p.id === r.postId));
        return (
          <div
            onClick={() => setReportsPanelOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: 400, maxWidth: "92vw", maxHeight: "80vh", overflowY: "auto", background: "#1C1C1F", border: "1px solid #2E2E33", borderRadius: 20, padding: "24px", position: "relative" }}
            >
              <button
                onClick={() => setReportsPanelOpen(false)}
                style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#8B8B93" }}
              >
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
                        Post by <span style={{ color: "#EDEDEF", fontWeight: 600 }}>{r.postAuthor}</span> · reported by {r.reportedBy}
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
      })()}
    </Wrap>
  );
}

function Wrap({ children }) {
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
