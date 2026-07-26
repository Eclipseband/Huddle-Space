import { useState, useEffect } from "react";
import { collection, doc, setDoc, deleteDoc, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { PROFILE_KEY } from "../constants";

export default function useProfile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) setProfile(JSON.parse(saved));
  }, []);

  async function joinHuddle(name, pin, members) {
    const trimmed = name.trim();
    const pinTrimmed = (pin || "").trim();
    if (!trimmed) return { error: "" };

    const existing = Object.keys(members).find((n) => n.toLowerCase() === trimmed.toLowerCase());

    if (existing) {
      const existingPin = members[existing]?.pin;
      if (existingPin) {
        if (pinTrimmed !== existingPin) {
          return { error: "Wrong PIN for that account." };
        }
      } else if (pinTrimmed) {
        // No PIN set yet on this account — the PIN they just typed becomes their PIN going forward
        setDoc(doc(db, "members", existing), { pin: pinTrimmed }, { merge: true });
      }
      const newProfile = { name: existing };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      setProfile(newProfile);
      return { error: "" };
    }

    const newProfile = { name: trimmed };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    setProfile(newProfile);
    setDoc(doc(db, "members", trimmed), { joinedAt: Date.now(), bio: "", following: [], pin: pinTrimmed || "" });
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
