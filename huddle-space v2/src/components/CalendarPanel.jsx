import { useState } from "react";
import { X, Plus, ChevronLeft, ChevronRight, Trash2, Clock } from "lucide-react";
import useEvents from "../hooks/useEvents";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function todayKey() {
  const t = new Date();
  return toDateKey(t.getFullYear(), t.getMonth(), t.getDate());
}

export default function CalendarPanel({ onClose, profile, memberNames }) {
  const { events, createEvent, updateEvent, deleteEvent } = useEvents(profile);

  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [attendees, setAttendees] = useState([]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const eventsByDate = {};
  events.forEach((e) => {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  });

  const selectedEvents = eventsByDate[selectedDate] || [];

  function changeMonth(delta) {
    setViewDate(new Date(year, month + delta, 1));
  }

  function resetForm() {
    setFormOpen(false);
    setEditingId(null);
    setTitle("");
    setTime("");
    setDescription("");
    setAttendees([]);
  }

  function openNewEventForm() {
    resetForm();
    setFormOpen(true);
  }

  function openEditForm(ev) {
    setEditingId(ev.id);
    setTitle(ev.title);
    setTime(ev.time || "");
    setDescription(ev.description || "");
    setAttendees(ev.attendees || []);
    setFormOpen(true);
  }

  function toggleAttendee(name) {
    setAttendees((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  async function handleSave() {
    if (!title.trim()) return;
    if (editingId) {
      await updateEvent(editingId, { title: title.trim(), time, description, attendees });
    } else {
      await createEvent({ title, date: selectedDate, time, description, attendees });
    }
    resetForm();
  }

  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 820, maxWidth: "96vw", height: 620, maxHeight: "90vh", background: "#1C1C1F", border: "1px solid #2E2E33", borderRadius: 20, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid #2E2E33" }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 18, color: "#EDEDEF", flex: 1 }}>
            Calendar
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div style={{ width: 420, borderRight: "1px solid #2E2E33", padding: 20, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <button onClick={() => changeMonth(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93" }}>
                <ChevronLeft size={18} />
              </button>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "#EDEDEF" }}>
                {monthLabel}
              </div>
              <button onClick={() => changeMonth(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93" }}>
                <ChevronRight size={18} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
              {WEEKDAYS.map((w, i) => (
                <div key={i} style={{ textAlign: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#5C5C63", padding: "4px 0" }}>
                  {w}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {cells.map((day, i) => {
                if (day === null) return <div key={i} />;
                const key = toDateKey(year, month, day);
                const hasEvents = !!eventsByDate[key];
                const isSelected = key === selectedDate;
                const isToday = key === todayKey();
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(key)}
                    style={{
                      aspectRatio: "1",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: isSelected ? "#FF8A4C" : "transparent",
                      border: isToday && !isSelected ? "1px solid #FF8A4C" : "1px solid transparent",
                    }}
                  >
                    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: isSelected ? "#16161A" : "#EDEDEF" }}>
                      {day}
                    </div>
                    {hasEvents && (
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "#16161A" : "#FF8A4C", marginTop: 2 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#EDEDEF" }}>
                {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <button
                onClick={openNewEventForm}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #2E2E33", borderRadius: 999, color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600, padding: "6px 12px", cursor: "pointer" }}
              >
                <Plus size={13} /> New event
              </button>
            </div>

            {formOpen && (
              <div style={{ background: "#16161A", border: "1px solid #2E2E33", borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #2E2E33", background: "#1C1C1F", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none", marginBottom: 8 }}
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #2E2E33", background: "#1C1C1F", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none", marginBottom: 8 }}
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #2E2E33", background: "#1C1C1F", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none", marginBottom: 8, resize: "none" }}
                />
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93", marginBottom: 6 }}>ATTENDEES</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {memberNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => toggleAttendee(name)}
                      style={{
                        padding: "4px 10px", borderRadius: 999, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, cursor: "pointer",
                        border: attendees.includes(name) ? "1px solid #FF8A4C" : "1px solid #2E2E33",
                        background: attendees.includes(name) ? "rgba(255,138,76,0.12)" : "transparent",
                        color: attendees.includes(name) ? "#FF8A4C" : "#8B8B93",
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={resetForm} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #2E2E33", background: "none", color: "#8B8B93", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12 }}>
                    Cancel
                  </button>
                  <button onClick={handleSave} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#FF8A4C", color: "#16161A", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600 }}>
                    {editingId ? "Save" : "Create"}
                  </button>
                </div>
              </div>
            )}

            {selectedEvents.length === 0 && !formOpen ? (
              <div style={{ textAlign: "center", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, marginTop: 30 }}>
                No events on this day.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedEvents.map((ev) => (
                  <div key={ev.id} onClick={() => openEditForm(ev)} style={{ background: "#16161A", border: "1px solid #2E2E33", borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#EDEDEF" }}>{ev.title}</div>
                        {ev.time && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                            <Clock size={11} color="#8B8B93" />
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93" }}>{ev.time}</span>
                          </div>
                        )}
                        {ev.description && (
                          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#8B8B93", marginTop: 4 }}>{ev.description}</div>
                        )}
                        {ev.attendees?.length > 0 && (
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#5C5C63", marginTop: 4 }}>
                            {ev.attendees.join(", ")}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEvent(ev.id);
                        }}
                        style={{ background: "none", border: "none", color: "#5C5C63", cursor: "pointer" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
