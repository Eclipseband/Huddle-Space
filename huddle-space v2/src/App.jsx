import { useState } from "react";
import useProfile from "./hooks/useProfile";
import useMembers from "./hooks/useMembers";
import usePosts from "./hooks/usePosts";
import useNotifications from "./hooks/useNotifications";
import useDirectMessages from "./hooks/useDirectMessages";
import useReports from "./hooks/useReports";
import TeamMembersPanel from "./components/TeamMembersPanel";

import Wrap from "./components/Wrap";
import JoinScreen from "./components/JoinScreen";
import MemberRail from "./components/MemberRail";
import Header from "./components/Header";
import ComposeBox from "./components/ComposeBox";
import Feed from "./components/Feed";
import DMPanel from "./components/DMPanel";
import ProfileModal from "./components/ProfileModal";
import MembersDirectory from "./components/MembersDirectory";
import ReportsPanel from "./components/ReportsPanel";
import TasksPanel from "./components/TasksPanel";
import AIAssistant from "./components/AIAssistant";
import GmailPanel from "./components/GmailPanel";
import GmailPanel from "./components/GmailPanel";
import MindMapPanel from "./components/MindMapPanel";

export default function App() {
  const { profile, joinHuddle, logOut, deleteAccount } = useProfile();
  const membersApi = useMembers(profile);
  const postsApi = usePosts(profile, membersApi.members, membersApi.memberNames);
  const notifApi = useNotifications(profile);
  const dmApi = useDirectMessages(profile);
  const reportsApi = useReports(profile);

  const [feedFilter, setFeedFilter] = useState("all");
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [profileName, setProfileName] = useState(null);
  const [membersDirectoryOpen, setMembersDirectoryOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [gmailOpen, setGmailOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [mindMapOpen, setMindMapOpen] = useState(false);

  function openProfile(name) {
    if (!name) return;
    setProfileName(name);
    setProfilePanelOpen(true);
  }

  function handleNotifClick(n) {
    notifApi.setNotifPanelOpen(false);
    if (n.type === "dm") dmApi.openConversation(n.from);
    else if (n.type === "report") reportsApi.setReportsPanelOpen(true);
    else openProfile(n.from);
  }

  if (!profile) {
    return (
      <Wrap>
        <JoinScreen onJoin={(name, pin) => joinHuddle(name, pin, membersApi.members)} />
      </Wrap>
    );
  }

  const sharedPostProps = {
    memberNames: membersApi.memberNames,
    isOnline: membersApi.isOnline,
    nameOf: membersApi.nameOf,
    openProfile,
    editingPostId: postsApi.editingPostId,
    editDraft: postsApi.editDraft,
    setEditDraft: postsApi.setEditDraft,
    startEditPost: postsApi.startEditPost,
    cancelEditPost: postsApi.cancelEditPost,
    saveEditPost: postsApi.saveEditPost,
    reportPost: postsApi.reportPost,
    togglePin: postsApi.togglePin,
    deletePost: postsApi.deletePost,
    votePoll: postsApi.votePoll,
    reactionPickerOpen: postsApi.reactionPickerOpen,
    setReactionPickerOpen: postsApi.setReactionPickerOpen,
    reactionListOpen: postsApi.reactionListOpen,
    setReactionListOpen: postsApi.setReactionListOpen,
    customEmoji: postsApi.customEmoji,
    setCustomEmoji: postsApi.setCustomEmoji,
    setReaction: postsApi.setReaction,
    openComments: postsApi.openComments,
    setOpenComments: postsApi.setOpenComments,
    commentDrafts: postsApi.commentDrafts,
    setCommentDrafts: postsApi.setCommentDrafts,
    addComment: postsApi.addComment,
  };

  return (
    <Wrap>
      <div className="hs-layout" style={{ display: "flex", gap: 24, maxWidth: 780, margin: "0 auto", padding: "32px 16px" }}>
        <MemberRail
          memberNames={membersApi.memberNames}
          members={membersApi.members}
          isOnline={membersApi.isOnline}
          profile={profile}
          openProfile={openProfile}
          onOpenDirectory={() => setMembersDirectoryOpen(true)}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <Header
            profile={profile}
            nameOf={membersApi.nameOf}
            openProfile={openProfile}
            notifications={notifApi.notifications}
            notifPanelOpen={notifApi.notifPanelOpen}
            setNotifPanelOpen={notifApi.setNotifPanelOpen}
            markNotificationsRead={notifApi.markNotificationsRead}
            onNotifClick={handleNotifClick}
            reports={reportsApi.reports}
            posts={postsApi.posts}
            onOpenTasks={() => setTasksOpen(true)}
            onOpenAI={() => setAiOpen(true)}
            onOpenGmail={() => setGmailOpen(true)}
            onOpenGmail={() => setGmailOpen(true)}
            onOpenMindMap={() => setMindMapOpen(true)}
            onOpenTeam={() => setTeamOpen(true)}
            onOpenReports={() => reportsApi.setReportsPanelOpen(true)}
            onOpenDM={() => {
              dmApi.setDmWith(null);
              dmApi.setDmPanelOpen(true);
            }}
          />

          <ComposeBox
            profile={profile}
            members={membersApi.members}
            memberNames={membersApi.memberNames}
            isOnline={membersApi.isOnline}
            composeText={postsApi.composeText}
            setComposeText={postsApi.setComposeText}
            composeImage={postsApi.composeImage}
            setComposeImage={postsApi.setComposeImage}
            composeVideo={postsApi.composeVideo}
            videoUploading={postsApi.videoUploading}
            videoError={postsApi.videoError}
            imageProcessing={postsApi.imageProcessing}
            imageError={postsApi.imageError}
            pollMode={postsApi.pollMode}
            setPollMode={postsApi.setPollMode}
            pollQuestion={postsApi.pollQuestion}
            setPollQuestion={postsApi.setPollQuestion}
            pollOptions={postsApi.pollOptions}
            setPollOptions={postsApi.setPollOptions}
            posting={postsApi.posting}
            handleFileSelect={postsApi.handleFileSelect}
            handleVideoSelect={postsApi.handleVideoSelect}
            cancelComposeVideo={postsApi.cancelComposeVideo}
            sharePost={postsApi.sharePost}
          />

          <Feed
            posts={postsApi.posts}
            feedFilter={feedFilter}
            setFeedFilter={setFeedFilter}
            profile={profile}
            members={membersApi.members}
            {...sharedPostProps}
          />
        </div>
      </div>

      {dmApi.dmPanelOpen && (
        <DMPanel
          onClose={() => dmApi.setDmPanelOpen(false)}
          dmWith={dmApi.dmWith}
          setDmWith={dmApi.setDmWith}
          dmNewChatOpen={dmApi.dmNewChatOpen}
          setDmNewChatOpen={dmApi.setDmNewChatOpen}
          conversations={dmApi.conversations}
          dmMessages={dmApi.dmMessages}
          dmDraft={dmApi.dmDraft}
          setDmDraft={dmApi.setDmDraft}
          sendDm={dmApi.sendDm}
          openConversation={dmApi.openConversation}
          profile={profile}
          members={membersApi.members}
          memberNames={membersApi.memberNames}
          isOnline={membersApi.isOnline}
          nameOf={membersApi.nameOf}
        />
      )}

      {profilePanelOpen && profileName && (
        <ProfileModal
          profileName={profileName}
          onClose={() => setProfilePanelOpen(false)}
          profile={profile}
          members={membersApi.members}
          posts={postsApi.posts}
          memberNames={membersApi.memberNames}
          isOnline={membersApi.isOnline}
          nameOf={membersApi.nameOf}
          saveDisplayName={membersApi.saveDisplayName}
          saveBio={membersApi.saveBio}
          avatarUploading={membersApi.avatarUploading}
          handleAvatarSelect={membersApi.handleAvatarSelect}
          toggleFollow={membersApi.toggleFollow}
          openProfile={openProfile}
          openConversation={dmApi.openConversation}
          logOut={logOut}
          deleteAccount={deleteAccount}
        />
      )}

      {membersDirectoryOpen && (
        <MembersDirectory
          onClose={() => setMembersDirectoryOpen(false)}
          memberNames={membersApi.memberNames}
          members={membersApi.members}
          isOnline={membersApi.isOnline}
          nameOf={membersApi.nameOf}
          profile={profile}
          openProfile={openProfile}
        />
      )}

      {tasksOpen && (
        <TasksPanel
          profile={profile}
          members={membersApi.members}
          memberNames={membersApi.memberNames}
          nameOf={membersApi.nameOf}
          onClose={() => setTasksOpen(false)}
        />
      )}
      {aiOpen && <AIAssistant onClose={() => setAiOpen(false)} />}
     {gmailOpen && (
  <GmailPanel profile={profile.name} onClose={() => setGmailOpen(false)} />
      {mindMapOpen && <MindMapPanel onClose={() => setMindMapOpen(false)} profile={profile} />}
)}
{teamOpen && (
  <TeamMembersPanel
    profile={profile}
    members={membersApi.members}
    memberNames={membersApi.memberNames}
    isOnline={membersApi.isOnline}
    nameOf={membersApi.nameOf}
    saveRoleAndTeam={membersApi.saveRoleAndTeam}
    openProfile={openProfile}
    onClose={() => setTeamOpen(false)}
  />
)}
      {reportsApi.reportsPanelOpen && (
        <ReportsPanel
          onClose={() => reportsApi.setReportsPanelOpen(false)}
          reports={reportsApi.reports}
          posts={postsApi.posts}
          nameOf={membersApi.nameOf}
          dismissReport={reportsApi.dismissReport}
          deletePost={postsApi.deletePost}
        />
      )}
    </Wrap>
  );
}
