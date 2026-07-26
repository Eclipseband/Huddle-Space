import { useState } from "react";
import Logo from "./Logo";
export default function JoinScreen({ onJoin }) {
  const [nameInput, setNameInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [joinError, setJoinError] = useState("");

  async function handleJoin() {
    const result = await onJoin(nameInput, pinInput);
    setJoinError(result?.error || "");
  }

  return (
    <div
      style={{
        maxWidth: 380,
        margin: "80px auto",
        padding: "40px 36px",
        background: "#1C1C1F",
        borderRadius: 20,
        border: "1px solid #2E2E33",
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
        <Logo size={30} />
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 32, color: "#EDEDEF" }}>Huddle Space</div>
      </div>
      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: "#8B8B93", fontSize: 14, marginBottom: 28 }}>
        A closed feed for people who already know each other.
      </div>
      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: "#5C5C63", fontSize: 12, marginBottom: 12 }}>
        Already joined before? Just type your name again.
      </div>
      <input
        value={nameInput}
        onChange={(e) => setNameInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        placeholder="What's your name?"
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid #2E2E33",
          background: "#1C1C1F",
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 15,
          marginBottom: 14,
          outline: "none",
        }}
      />
     {true && (
        <input
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          type="password"
          placeholder="PIN (set one the first time, then enter it to log back in)"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #2E2E33",
            background: "#1C1C1F",
            color: "#EDEDEF",
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 15,
            marginBottom: 14,
            outline: "none",
          }}
        />
      )}
      {joinError && (
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#FF8A4C", marginTop: -8, marginBottom: 14, textAlign: "left" }}>
          {joinError}
        </div>
      )}
      <button
        onClick={handleJoin}
        disabled={!nameInput.trim()}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 10,
          border: "none",
          background: nameInput.trim() ? "#FF8A4C" : "#2E2E33",
          color: "#16161A",
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontWeight: 600,
          fontSize: 15,
          cursor: nameInput.trim() ? "pointer" : "default",
        }}
      >
        Join the huddle
      </button>
    </div>
  );
}
