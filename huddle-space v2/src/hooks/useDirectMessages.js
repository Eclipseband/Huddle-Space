import { useState, useEffect } from "react";
import { collection, doc, setDoc, getDoc, addDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { convKey } from "../utils";

export default function useDirectMessages(profile) {
  const [dmPanelOpen, setDmPanelOpen] = useState(false);
  const [dmWith, setDmWith] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [dmNewChatOpen, setDmNewChatOpen] = useState(false);
  const [dmDraft, setDmDraft] = useState("");

  useEffect(() => {
    if (!dmPanelOpen || !dmWith || !profile) return;
    const key = convKey(profile.name, dmWith);
    const unsub = onSnapshot(doc(db, "dms", key), (d) => {
      setDmMessages(d.exists() ? d.data().messages || [] : []);
    });
    return () => unsub();
  }, [dmPanelOpen, dmWith, profile]);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, "dms"), where("participants", "array-contains", profile.name));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          const other = (data.participants || []).find((n) => n !== profile.name);
          return {
            id: d.id,
            with: other,
            lastMessage: data.lastMessage || "",
            lastTimestamp: data.lastTimestamp || 0,
          };
        })
        .filter((c) => c.with);
      list.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
      setConversations(list);
    });
    return () => unsub();
  }, [profile]);

  function openConversation(name) {
    if (!profile || !name || name === profile.name) return;
    setDmNewChatOpen(false);
    setDmWith(name);
    setDmPanelOpen(true);
  }

  async function sendDm() {
    const text = dmDraft.trim();
    if (!text || !dmWith || !profile) return;
    setDmDraft("");
    const key = convKey(profile.name, dmWith);
    const ref_ = doc(db, "dms", key);
    const snap = await getDoc(ref_);
    const existing = snap.exists() ? snap.data().messages || [] : [];
    const now = Date.now();
    await setDoc(ref_, {
      messages: [...existing, { from: profile.name, text, timestamp: now }],
      participants: [profile.name, dmWith],
      lastMessage: text,
      lastTimestamp: now,
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

  return {
    dmPanelOpen, setDmPanelOpen,
    dmWith, setDmWith,
    dmMessages,
    conversations,
    dmNewChatOpen, setDmNewChatOpen,
    dmDraft, setDmDraft,
    openConversation,
    sendDm,
  };
}
