import { useState, useEffect } from "react";
import { collection, doc, setDoc, deleteDoc, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { PROFILE_KEY, ADMIN_NAMES, ADMIN_PIN } from "../constants";

export default function useProfile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) setProfile(JSON.parse(saved));
  }, []);

  async function joinHuddle(name, pin, members) {
    const trimmed = name.trim();
    if (!trimmed) return { error: "" };
    const existing = Object.keys(members).find((n) => n.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (ADMIN_NAMES.includes(existing) && pin !== ADMIN_PIN) {
        return { error: "Wrong PIN for that account." };
      }
      const newProfile = { name: existing };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      setProfile(newProfile);
      return { error: "" };
    }
    const newProfile = { name: trimmed };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    setProfile(newProfile);
    setDoc(doc(db, "members", trimmed), { joinedAt: Date.now(), bio: "", following: [] });
    Object.keys(members).forEach((n) => {
      addDoc(collection(db, "notifications"), {
        to: n,
        type: "join",
        from: trimmed,
        message: `${trimmed} joined Huddle Space`,
        timestamp: Date.now(),
        read: false,
      });
    });
    return { error: "" };
  }

  function logOut() {
    localStorage.removeItem(PROFILE_KEY);
    setProfile(null);
  }

  async function deleteAccount() {
    if (!profile) return;
    await deleteDoc(doc(db, "members", profile.name));
    localStorage.removeItem(PROFILE_KEY);
    setProfile(null);
  }

  return { profile, joinHuddle, logOut, deleteAccount };
}
