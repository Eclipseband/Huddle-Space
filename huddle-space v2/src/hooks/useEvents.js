import { useState, useEffect } from "react";
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function useEvents(profile) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(collection(db, "events"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
      setEvents(list);
    });
    return () => unsub();
  }, [profile]);

  async function createEvent({ title, date, time, description, attendees }) {
    if (!title?.trim() || !date) return;
    await addDoc(collection(db, "events"), {
      title: title.trim(),
      date,
      time: time || "",
      description: description || "",
      attendees: attendees || [],
      createdBy: profile.name,
      createdAt: Date.now(),
    });
  }

  async function updateEvent(eventId, updates) {
    await updateDoc(doc(db, "events", eventId), updates);
  }

  async function deleteEvent(eventId) {
    await deleteDoc(doc(db, "events", eventId));
  }

  return { events, createEvent, updateEvent, deleteEvent };
}
