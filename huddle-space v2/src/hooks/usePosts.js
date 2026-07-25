import { useState, useEffect } from "react";
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { compressImageFile, extractMentionedNames, uploadVideoToCloudinary } from "../utils";
import { ADMIN_NAMES } from "../constants";

export default function usePosts(profile, members, memberNames) {
  const [posts, setPosts] = useState([]);
  const [composeText, setComposeText] = useState("");
  const [composeImage, setComposeImage] = useState(null);
  const [composeVideo, setComposeVideo] = useState(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [imageProcessing, setImageProcessing] = useState(false);
  const [imageError, setImageError] = useState("");
  const [pollMode, setPollMode] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [reactionPickerOpen, setReactionPickerOpen] = useState({});
  const [reactionListOpen, setReactionListOpen] = useState(null);
  const [customEmoji, setCustomEmoji] = useState("");
  const [openComments, setOpenComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [posting, setPosting] = useState(false);

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

  async function handleFileSelect(file) {
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

  function handleVideoSelect(file) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setVideoError("That file isn't a video.");
      return;
    }
    const MAX_MB = 50;
    if (file.size > MAX_MB * 1024 * 1024) {
      setVideoError(`That video is too large — keep it under ${MAX_MB}MB.`);
      return;
    }
    setVideoError("");
    if (composeVideo?.previewUrl) URL.revokeObjectURL(composeVideo.previewUrl);
    setComposeVideo({ file, previewUrl: URL.createObjectURL(file) });
  }

  function cancelComposeVideo() {
    if (composeVideo?.previewUrl) URL.revokeObjectURL(composeVideo.previewUrl);
    setComposeVideo(null);
    setVideoError("");
  }

  async function sharePost() {
    const text = composeText.trim();
    const validPollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    const isValidPoll = pollMode && pollQuestion.trim() && validPollOptions.length >= 2;
    if (!text && !isValidPoll && !composeImage && !composeVideo) return;

    setPosting(true);
    try {
      let videoUrl = null;
      if (composeVideo) {
        setVideoUploading(true);
        videoUrl = await uploadVideoToCloudinary(composeVideo.file);
        setVideoUploading(false);
      }

      await addDoc(collection(db, "posts"), {
        author: profile.name,
        text,
        imageUrl: composeImage || null,
        videoUrl: videoUrl || null,
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
        .filter(
          (n) =>
            n !== profile.name &&
            ((members[n]?.following || []).includes(profile.name) || mentioned.includes(n))
        )
        .forEach((n) => {
          addDoc(collection(db, "notifications"), {
            to: n,
            type: mentioned.includes(n) ? "mention" : "post",
            from: profile.name,
            message: mentioned.includes(n)
              ? `${profile.name} mentioned you in a post`
              : `${profile.name} posted something new`,
            timestamp: Date.now(),
            read: false,
          });
        });

      setComposeText("");
      setComposeImage(null);
      cancelComposeVideo();
      setImageError("");
      setPollMode(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
    } catch (err) {
      setVideoError("Something went wrong posting. Try again.");
    } finally {
      setPosting(false);
      setVideoUploading(false);
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

  async function addComment(postId, text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const nextComments = [...(post.comments || []), { author: profile.name, text: trimmed, timestamp: Date.now() }];
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
    extractMentionedNames(trimmed, memberNames)
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

  async function deletePost(postId, author) {
    const isAdmin = ADMIN_NAMES.includes(profile.name);
    if (author !== profile.name && !isAdmin) return;
    const message =
      author === profile.name
        ? "Delete this post? This can't be undone."
        : `Delete ${author}'s post as an admin? This can't be undone.`;
    const confirmed = window.confirm(message);
    if (!confirmed) return;
    await deleteDoc(doc(db, "posts", postId));
  }

  return {
    posts,
    composeText, setComposeText,
    composeImage, setComposeImage,
    composeVideo,
    videoUploading,
    videoError,
    imageProcessing,
    imageError,
    pollMode, setPollMode,
    pollQuestion, setPollQuestion,
    pollOptions, setPollOptions,
    editingPostId, editDraft, setEditDraft,
    reactionPickerOpen, setReactionPickerOpen,
    reactionListOpen, setReactionListOpen,
    customEmoji, setCustomEmoji,
    openComments, setOpenComments,
    commentDrafts, setCommentDrafts,
    posting,
    handleFileSelect,
    handleVideoSelect,
    cancelComposeVideo,
    sharePost,
    setReaction,
    addComment,
    votePoll,
    startEditPost,
    cancelEditPost,
    saveEditPost,
    reportPost,
    togglePin,
    deletePost,
  };
}
