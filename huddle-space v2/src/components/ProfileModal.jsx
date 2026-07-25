import { useState } from "react";
import { X, ArrowLeft, Camera } from "lucide-react";
import Avatar from "./Avatar";
import { ADMIN_NAMES } from "../constants";

export default function ProfileModal({
  profileName,
  onClose,
  profile,
  members,
  posts,
  memberNames,
  isOnline,
  nameOf,
  saveDisplayName,
  saveBio,
  avatarUploading,
  handleAvatarSelect,
  toggleFollow,
  openProfile,
  openConversation,
  logOut,
  deleteAccount,
}) {
  const [profileListView, setProfileListView] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");

  const targetMember = members[profileName] || {};
  const targetPosts = posts.filter((p) => p.author === profileName);
  const postCount = targetPosts.length;
  const reactionsReceived = targetPosts.reduce(
    (sum, p) => sum + Object.values(p.reactions || {}).reduce((s, arr) => s + arr.length, 0),
    0
  );
  const followingList = targetMember.following || [];
  const followingCount = followingList.length;
  const followersList = memberNames.filter((n) => (members[n]?.following || []).includes(profileName));
  const followersCount = followersList.length;
  const isOwnProfile = profileName === profile.name;
  const iFollowThem = (members[profile.name]?.following || []).includes(profileName);
  const listToShow = profileListView === "followers" ? followersList : profileListView === "following" ? followingList : null;

  function startEditName() {
    setNameDraft(nameOf(profile.name));
    setNameError("");
    setEditingName(true);
  }

  async function handleSaveName() {
    const result = await saveDisplayName(nameDraft);
    if (result?.error) {
      setNameError(result.error);
    } else {
      setEditingName(false);
    }
  }

  function startEditBio() {
    setBioDraft(targetMember.bio || "");
    setEditingBio(true);
  }

  async function handleSaveBio() {
    await saveBio(bioDraft);
    setEditingBio(false);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(43,42,40,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 360, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto", background: "#1C1C1F", borderRadius: 20, padding: "28px 24px", position: "relative" }}>
        {listToShow ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <button onClick={() => setProfileListView(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", padding: 0 }}>
                <ArrowLeft size={18} />
              </button>
              <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 18, color: "#EDEDEF" }}>
                {profileListView === "followers" ? "Followers" : "Following"}
              </div>
            </div>
            {listToShow.length === 0 ? (
              <div style={{ textAlign: "center", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, padding: "20px 0" }}>
                {profileListView === "followers" ? "No followers yet." : "Not following anyone yet."}
              </div>
            ) : (
              listToShow.map((n) => (
                <div key={n} onClick={() => openProfile(n)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", cursor: "pointer" }}>
                  <Avatar name={n} size={34} photoURL={members[n]?.photoURL} online={isOnline(n)} />
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: "#EDEDEF" }}>{nameOf(n)}</div>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#8B8B93" }}>
              <X size={18} />
            </button>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              {isOwnProfile ? (
                <label style={{ position: "relative", cursor: avatarUploading ? "default" : "pointer", width: 64, height: 64, display: "inline-block" }} title="Change profile photo">
                  <Avatar name={profileName} size={64} photoURL={targetMember.photoURL} />
                  <div
                    style={{
                      position: "absolute", bottom: -2, right: -2, width: 24, height: 24, borderRadius: "50%",
                      background: "#FF8A4C", border: "2px solid #1C1C1F", display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Camera size={12} color="#16161A" />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      handleAvatarSelect(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                    style={{ display: "none" }}
                  />
                </label>
              ) : (
                <Avatar name={profileName} size={64} photoURL={targetMember.photoURL} online={isOnline(profileName)} />
              )}
              {avatarUploading && (
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93", marginTop: 4 }}>Uploading…</div>
              )}

              {editingName ? (
                <div style={{ width: "100%", marginTop: 12 }}>
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    style={{
                      width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 10, border: "1px solid #2E2E33",
                      background: "#16161A", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, outline: "none", textAlign: "center",
                    }}
                  />
                  {nameError && (
                    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: "#FF8A4C", marginTop: 4 }}>{nameError}</div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "center" }}>
                    <button onClick={() => setEditingName(false)} style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid #2E2E33", background: "transparent", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button onClick={handleSaveName} style={{ padding: "6px 14px", borderRadius: 999, border: "none", background: "#FF8A4C", color: "#16161A", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 22, color: "#EDEDEF", marginTop: 12 }}>
                  {nameOf(profileName)}
                  {isOwnProfile && (
                    <span onClick={startEditName} title="Change your display name" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontStyle: "normal", fontSize: 12, color: "#8B8B93", cursor: "pointer", marginLeft: 6 }}>
                      ✎
                    </span>
                  )}
                  {ADMIN_NAMES.includes(profileName) && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontStyle: "normal", fontSize: 10, color: "#FF8A4C", border: "1px solid #FF8A4C", borderRadius: 999, padding: "2px 8px", marginLeft: 8, verticalAlign: "middle" }}>
                      ADMIN
                    </span>
                  )}
                </div>
              )}

              {editingBio ? (
                <div style={{ width: "100%", marginTop: 12 }}>
                  <textarea
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                    placeholder="Write a short bio…"
                    rows={3}
                    maxLength={160}
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 10, border: "1px solid #2E2E33", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, resize: "none", outline: "none" }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "center" }}>
                    <button onClick={() => setEditingBio(false)} style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid #2E2E33", background: "transparent", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button onClick={handleSaveBio} style={{ padding: "6px 14px", borderRadius: 999, border: "none", background: "#FF8A4C", color: "#16161A", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: targetMember.bio ? "#EDEDEF" : "#5C5C63", marginTop: 8, lineHeight: 1.5 }}>
                  {targetMember.bio || (isOwnProfile ? "No bio yet — add one below." : "No bio yet.")}
                </div>
              )}

              <div style={{ display: "flex", gap: 18, marginTop: 18, paddingTop: 16, borderTop: "1px solid #2E2E33", width: "100%", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#EDEDEF" }}>{postCount}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93" }}>Posts</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#EDEDEF" }}>{reactionsReceived}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93" }}>Reactions</div>
                </div>
                <div style={{ textAlign: "center", cursor: "pointer" }} onClick={() => setProfileListView("followers")}>
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#EDEDEF" }}>{followersCount}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93", textDecoration: "underline" }}>Followers</div>
                </div>
                <div style={{ textAlign: "center", cursor: "pointer" }} onClick={() => setProfileListView("following")}>
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#EDEDEF" }}>{followingCount}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93", textDecoration: "underline" }}>Following</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap", justifyContent: "center" }}>
                {isOwnProfile ? (
                  <>
                    {!editingBio && (
                      <button onClick={startEditBio} style={{ padding: "8px 16px", borderRadius: 999, border: "1px solid #2E2E33", background: "transparent", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                        Edit bio
                      </button>
                    )}
                    <button onClick={logOut} style={{ padding: "8px 16px", borderRadius: 999, border: "1px solid #2E2E33", background: "transparent", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                      Log out
                    </button>
                    <button onClick={deleteAccount} style={{ padding: "8px 16px", borderRadius: 999, border: "1px solid #FF8A4C", background: "transparent", color: "#FF8A4C", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                      Delete account
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => toggleFollow(profileName)}
                      style={{
                        padding: "8px 16px", borderRadius: 999, border: iFollowThem ? "1px solid #2E2E33" : "none",
                        background: iFollowThem ? "transparent" : "#FF8A4C", color: iFollowThem ? "#EDEDEF" : "#16161A",
                        fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer",
                      }}
                    >
                      {iFollowThem ? "Following" : "Follow"}
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        openConversation(profileName);
                      }}
                      style={{ padding: "8px 16px", borderRadius: 999, border: "1px solid #2E2E33", background: "transparent", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                    >
                      Message
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
