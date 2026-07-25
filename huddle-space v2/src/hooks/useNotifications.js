import { useState, useEffect, useRef } from "react";
import { collection, doc, updateDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";

export default function useNotifications(profile) {
  const [notifications, setNotifications] = useState([]);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const seenNotifIds = useRef(new Set());
  const notifLoaded = useRef(false);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, "notifications"), where("to", "==", profile.name));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setNotifications(list);
      if (notifLoaded.current && typeof Notification !== "undefined" && Notification.permission === "granted") {
        list.forEach((n) => {
          if (!seenNotifIds.current.has(n.id)) {
            new Notification("Huddle Space", { body: n.message });
          }
        });
      }
      list.forEach((n) => seenNotifIds.current.add(n.id));
      notifLoaded.current = true;
    });
    return () => unsub();
  }, [profile]);

  function markNotificationsRead() {
    notifications.filter((n) => !n.read).forEach((n) => {
      updateDoc(doc(db, "notifications", n.id), { read: true });
    });
  }

  return { notifications, notifPanelOpen, setNotifPanelOpen, markNotificationsRead };
}
