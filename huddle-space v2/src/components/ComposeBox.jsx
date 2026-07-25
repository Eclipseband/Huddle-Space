import { useRef } from "react";
import { Image as ImageIcon, Camera, BarChart3, Send, X } from "lucide-react";
import Avatar from "./Avatar";

export default function ComposeBox({
  profile,
  members,
  memberNames,
  isOnline,
  composeText, setComposeText,
  composeImage, setComposeImage,
  composeVideo,
  videoUploading,
  videoError,
  imageProcessing,
  imageError,
  pollMode, setPollMode,
  pollQuestion, setPollQuestion,
  pollOptions, setPollOptions,
  posting,
  handleFileSelect,
  handleVideoSelect,
  cancelComposeVideo,
  sharePost,
}) {
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const validPollOptionsCount = pollOptions.filter((o) => o.trim()).length;
  const canSubmitPoll = pollMode && pollQuestion.trim() && validPollOptionsCount >= 2;
  const canShare = composeText.trim() || composeImage || composeVideo || canSubmitPoll;

  return (
    <div style={{ background: "#1C1C1F", border: "1px solid #2E2E33", borderRadius: 18, padding: "20px 20px 16px", marginBottom: 28 }}>
      <div style={{ display: "flex", marginBottom: 14, marginLeft: 8 }}>
        {memberNames.slice(0, 6).map((n, i) => (
          <div
            key={n}
            title={n === profile.name ? `${n} (you)` : `View ${n}'s profile`}
            style={{ marginLeft: -8, transform: `rotate(${(i % 3) - 1}deg)`, zIndex: 6 - i }}
          >
            <Avatar name={n} size={30} photoURL={members[n]?.photoURL} online={isOnline(n)} />
          </div>
        ))}
        {memberNames.length > 6 && (
          <div
            style={{
              marginLeft: -8,
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "#2E2E33",
              color: "#8B8B93",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              border: "2px solid #16161A",
            }}
          >
            +{memberNames.length - 6}
          </div>
        )}
      </div>

      <textarea
        value={composeText}
        onChange={(e) => setComposeText(e.target.value)}
        placeholder={pollMode ? "Add a caption (optional)" : "What's going on? Tip: @Name to mention someone"}
        rows={3}
        style={{
          width: "100%",
          boxSizing: "border-box",
          resize: "none",
          border: "none",
          background: "transparent",
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 15,
          color: "#EDEDEF",
          outline: "none",
        }}
      />

      {pollMode && (
        <div style={{ background: "#16161A", border: "1px solid #2E2E33", borderRadius: 12, padding: 12, marginTop: 4 }}>
          <input
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="Ask a question…"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #2E2E33",
              background: "#1C1C1F",
              color: "#EDEDEF",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 13,
              outline: "none",
              marginBottom: 8,
            }}
          />
          {pollOptions.map((opt, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                value={opt}
                onChange={(e) => setPollOptions((opts) => opts.map((o, oi) => (oi === i ? e.target.value : o)))}
                placeholder={`Option ${i + 1}`}
                style={{
                  flex: 1,
                  boxSizing: "border-box",
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: "1px solid #2E2E33",
                  background: "#1C1C1F",
                  color: "#EDEDEF",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              {pollOptions.length > 2 && (
                <button
                  onClick={() => setPollOptions((opts) => opts.filter((_, oi) => oi !== i))}
                  style={{ background: "none", border: "none", color: "#5C5C63", cursor: "pointer" }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            {pollOptions.length < 6 ? (
              <button
                onClick={() => setPollOptions((opts) => [...opts, ""])}
                style={{ background: "none", border: "none", color: "#8B8B93", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12 }}
              >
                + Add option
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={() => {
                setPollMode(false);
                setPollQuestion("");
                setPollOptions(["", ""]);
              }}
              style={{ background: "none", border: "none", color: "#5C5C63", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12 }}
            >
              Cancel poll
            </button>
          </div>
        </div>
      )}

      {composeImage && (
        <div style={{ position: "relative", marginTop: 8, display: "inline-block" }}>
          <img src={composeImage} alt="Selected" style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 10, display: "block" }} />
          <button
            onClick={() => setComposeImage(null)}
            style={{
              position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", border: "none",
              background: "rgba(43,42,40,0.7)", color: "#16161A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {imageError && (
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#FF8A4C", marginTop: 6 }}>{imageError}</div>
      )}

      {composeVideo && (
        <div style={{ position: "relative", marginTop: 8, display: "inline-block" }}>
          <video src={composeVideo.previewUrl} controls style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 10, display: "block" }} />
          <button
            onClick={cancelComposeVideo}
            style={{
              position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", border: "none",
              background: "rgba(43,42,40,0.7)", color: "#16161A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {videoUploading && (
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#8B8B93", marginTop: 6 }}>Uploading video…</div>
      )}
      {videoError && (
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#FF8A4C", marginTop: 6 }}>{videoError}</div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            handleFileSelect(e.target.files?.[0]);
            e.target.value = "";
          }}
          style={{ display: "none" }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={(e) => {
            handleVideoSelect(e.target.files?.[0]);
            e.target.value = "";
          }}
          style={{ display: "none" }}
        />
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={imageProcessing}
            style={{
              display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8B8B93",
              cursor: imageProcessing ? "default" : "pointer", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, padding: "6px 8px",
            }}
          >
            <ImageIcon size={16} /> {imageProcessing ? "Processing…" : "Photo"}
          </button>
          <button
            onClick={() => videoInputRef.current?.click()}
            style={{
              display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8B8B93",
              cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, padding: "6px 8px",
            }}
          >
            <Camera size={16} /> Video
          </button>
          <button
            onClick={() => setPollMode((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
              color: pollMode ? "#FF8A4C" : "#8B8B93", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, padding: "6px 8px",
            }}
          >
            <BarChart3 size={16} /> Poll
          </button>
        </div>
        <button
          onClick={sharePost}
          disabled={!canShare || posting}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 999, border: "none",
            background: canShare ? "#FF8A4C" : "#2E2E33", color: "#16161A", fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: 600, fontSize: 13, cursor: canShare ? "pointer" : "default",
          }}
        >
          {posting ? (videoUploading ? "Uploading…" : "Sharing…") : "Share"} <Send size={13} />
        </button>
      </div>
    </div>
  );
}
