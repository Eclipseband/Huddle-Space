import { useState, useEffect } from "react";
import { collection, doc, setDoc, addDoc, onSnapshot, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../firebase";
import { compressImageFile } from "../utils";

export default function useMembers(profile) {
  const [members, setMembers] = useState({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [presenceTick, setPresenceTick] = useState(0);

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

  useEffect(() => {
    const interval = setInterval(() => setPresenceTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  function isOnline(name) {
    void presenceTick;
    const t = members[name]?.lastActive;
    return !!t && Date.now() - t < 90000;
  }

  function nameOf(n) {
    return members[n]?.displayName || n;
  }

  async function toggleFollow(targetName) {
    if (!profile) return;
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

  async function handleAvatarSelect(file) {
    if (!profile || !file || !file.type.startsWith("image/")) return;
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

  async function saveBio(text) {
    if (!profile) return;
    await setDoc(doc(db, "members", profile.name), { bio: text.trim() }, { merge: true });
  }

  async function saveDisplayName(newName) {
    if (!profile) return { error: null };
    const taken = Object.keys(members).some(
      (n) => n !== profile.name && nameOf(n).toLowerCase() === newName.trim().toLowerCase()
    );
    if (taken) return { error: "Someone already has that name." };
    await setDoc(doc(db, "members", profile.name), { displayName: newName.trim() }, { merge: true });
    return { error: null };
  }
  async function saveRoleAndTeam(name, role, team) {
    await setDoc(doc(db, "members", name), { role: role.trim(), team: team.trim() }, { merge: true });
  }

 return {
    members,
    memberNames: Object.keys(members),
    isOnline,
    nameOf,
    toggleFollow,
    handleAvatarSelect,
    avatarUploading,
    saveBio,
    saveDisplayName,
    saveRoleAndTeam,
  };
}
