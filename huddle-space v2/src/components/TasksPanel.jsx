import { useState, useEffect } from "react";
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import Avatar from "./Avatar";
import { X, Plus, Trash2 } from "lucide-react";
import { ADMIN_NAMES } from "../constants";

const STATUSES = ["To do", "In progress", "Done"];

export default function TasksPanel({ profile, members, memberNames, nameOf, onClose }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(profile.name);
  const isAdmin = ADMIN_NAMES.includes(profile.name);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tasks"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setTasks(list);
    });
    return () => unsub();
  }, []);

  async function addTask() {
    const text = title.trim();
    if (!text) return;
    await addDoc(collection(db, "tasks"), {
      title: text,
      assignee,
      status: "To do",
      createdBy: profile.name,
      createdAt: Date.now(),
    });
    setTitle("");
  }

  async function cycleStatus(task) {
    const nextIndex = (STATUSES.indexOf(task.status) + 1) % STATUSES.length;
    await updateDoc(doc(db, "tasks", task.id), { status: STATUSES[nextIndex] });
  }

  async function removeTask(id) {
    await deleteDoc(doc(db, "tasks", id));
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 640, maxWidth: "94vw", maxHeight: "85vh", overflowY: "auto", background: "#1C1C1F", border: "1px solid #2E2E33", borderRadius: 20, padding: 24, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#8B8B93" }}>
          <X size={18} />
        </button>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 20, color: "#EDEDEF", marginBottom: 16 }}>Tasks</div>

        {isAdmin && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="New task…"
              style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #2E2E33", background: "#16161A", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none" }}
            />
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #2E2E33", background: "#16161A", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13 }}
            >
              {memberNames.map((n) => (
                <option key={n} value={n}>{nameOf(n)}</option>
              ))}
            </select>
            <button onClick={addTask} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#FF8A4C", color: "#16161A", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <Plus size={16} />
            </button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {STATUSES.map((status) => (
            <div key={status}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8B93", marginBottom: 8 }}>{status.toUpperCase()}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tasks.filter((t) => t.status === status).map((t) => (
                  <div key={t.id} style={{ background: "#16161A", border: "1px solid #2E2E33", borderRadius: 10, padding: 10 }}>
                    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#EDEDEF", marginBottom: 8 }}>{t.title}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Avatar name={t.assignee} size={20} photoURL={members[t.assignee]?.photoURL} />
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93" }}>{nameOf(t.assignee)}</span>
                      </div>
                      {isAdmin && (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => cycleStatus(t)} title="Move to next status" style={{ background: "none", border: "1px solid #2E2E33", borderRadius: 6, color: "#8B8B93", fontSize: 10, padding: "2px 6px", cursor: "pointer" }}>
                            →
                          </button>
                          <button onClick={() => removeTask(t.id)} style={{ background: "none", border: "none", color: "#5C5C63", cursor: "pointer", display: "flex" }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
