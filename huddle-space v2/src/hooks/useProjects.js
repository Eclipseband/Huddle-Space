import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export default function useProjects(profile) {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  async function createProject({ name, description, icon, color, members }) {
    if (!profile) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;
    await addDoc(collection(db, "projects"), {
      name: trimmedName,
      description: (description || "").trim(),
      icon: icon || "🚀",
      color: color || "#FF8A4C",
      createdBy: profile.name,
      members: members && members.length ? members : [profile.name],
      createdAt: Date.now(),
    });
  }

  return { projects, createProject };
}
