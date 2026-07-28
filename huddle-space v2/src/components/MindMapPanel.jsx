import { useState, useEffect, useRef } from "react";
import { X, Plus, ArrowLeft, Trash2, Link2 } from "lucide-react";
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

const NODE_WIDTH = 160;
const NODE_HEIGHT = 56;

export default function MindMapPanel({ onClose, profile }) {
  const [boards, setBoards] = useState([]);
  const [newBoardName, setNewBoardName] = useState("");
  const [currentBoardId, setCurrentBoardId] = useState(null);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [connectMode, setConnectMode] = useState(false);
  const [connectFromId, setConnectFromId] = useState(null);

  const [dragState, setDragState] = useState(null); // { id, startClientX, startClientY, startX, startY }
  const [dragPos, setDragPos] = useState(null); // { id, x, y } visual override while dragging

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "mindmapBoards"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setBoards(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentBoardId) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const unsubNodes = onSnapshot(collection(db, "mindmapBoards", currentBoardId, "nodes"), (snap) => {
      setNodes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubEdges = onSnapshot(collection(db, "mindmapBoards", currentBoardId, "edges"), (snap) => {
      setEdges(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubNodes();
      unsubEdges();
    };
  }, [currentBoardId]);

  async function createBoard() {
    const name = newBoardName.trim();
    if (!name) return;
    const ref = await addDoc(collection(db, "mindmapBoards"), {
      name,
      createdBy: profile.name,
      createdAt: Date.now(),
    });
    setNewBoardName("");
    setCurrentBoardId(ref.id);
  }

  async function deleteBoard(boardId) {
    const confirmed = window.confirm("Delete this board and everything on it? This can't be undone.");
    if (!confirmed) return;
    const nodesSnap = await getDocs(collection(db, "mindmapBoards", boardId, "nodes"));
    await Promise.all(nodesSnap.docs.map((d) => deleteDoc(d.ref)));
    const edgesSnap = await getDocs(collection(db, "mindmapBoards", boardId, "edges"));
    await Promise.all(edgesSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, "mindmapBoards", boardId));
    if (currentBoardId === boardId) setCurrentBoardId(null);
  }

  async function addNode() {
    if (!currentBoardId) return;
    await addDoc(collection(db, "mindmapBoards", currentBoardId, "nodes"), {
      text: "New idea",
      x: 40 + Math.random() * 300,
      y: 40 + Math.random() * 200,
      createdBy: profile.name,
    });
  }

  function startEditNode(node) {
    setEditingNodeId(node.id);
    setEditDraft(node.text);
  }

  async function saveNodeText() {
    if (!editingNodeId) return;
    const text = editDraft.trim() || "Untitled";
    await updateDoc(doc(db, "mindmapBoards", currentBoardId, "nodes", editingNodeId), { text });
    setEditingNodeId(null);
  }

  async function deleteNode(nodeId) {
    await deleteDoc(doc(db, "mindmapBoards", currentBoardId, "nodes", nodeId));
    const relatedEdges = edges.filter((e) => e.from === nodeId || e.to === nodeId);
    await Promise.all(relatedEdges.map((e) => deleteDoc(doc(db, "mindmapBoards", currentBoardId, "edges", e.id))));
  }

  function handleNodeClick(node) {
    if (!connectMode) return;
    if (!connectFromId) {
      setConnectFromId(node.id);
      return;
    }
    if (connectFromId === node.id) {
      setConnectFromId(null);
      return;
    }
    const alreadyExists = edges.some(
      (e) => (e.from === connectFromId && e.to === node.id) || (e.from === node.id && e.to === connectFromId)
    );
    if (!alreadyExists) {
      addDoc(collection(db, "mindmapBoards", currentBoardId, "edges"), {
        from: connectFromId,
        to: node.id,
      });
    }
    setConnectFromId(null);
  }

  async function deleteEdge(edgeId) {
    await deleteDoc(doc(db, "mindmapBoards", currentBoardId, "edges", edgeId));
  }

  function handlePointerDown(e, node) {
    if (connectMode) return;
    e.stopPropagation();
    setDragState({
      id: node.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: node.x,
      startY: node.y,
    });
  }

  useEffect(() => {
    if (!dragState) return;

    function handleMove(e) {
      const deltaX = e.clientX - dragState.startClientX;
      const deltaY = e.clientY - dragState.startClientY;
      setDragPos({
        id: dragState.id,
        x: Math.max(0, dragState.startX + deltaX),
        y: Math.max(0, dragState.startY + deltaY),
      });
    }

    async function handleUp() {
      if (dragPos) {
        await updateDoc(doc(db, "mindmapBoards", currentBoardId, "nodes", dragState.id), {
          x: dragPos.x,
          y: dragPos.y,
        });
      }
      setDragState(null);
      setDragPos(null);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragState, dragPos, currentBoardId]);

  function positionOf(node) {
    if (dragPos && dragPos.id === node.id) return { x: dragPos.x, y: dragPos.y };
    return { x: node.x, y: node.y };
  }

  const currentBoard = boards.find((b) => b.id === currentBoardId);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 820, maxWidth: "96vw", height: 620, maxHeight: "90vh", background: "#1C1C1F", border: "1px solid #2E2E33", borderRadius: 20, display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid #2E2E33" }}>
          {currentBoardId ? (
            <button onClick={() => setCurrentBoardId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93", padding: 0 }}>
              <ArrowLeft size={18} />
            </button>
          ) : null}
          <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 18, color: "#EDEDEF", flex: 1 }}>
            {currentBoardId ? currentBoard?.name || "Mind Map" : "Mind Maps"}
          </div>
          {currentBoardId && (
            <button
              onClick={() => {
                setConnectMode((v) => !v);
                setConnectFromId(null);
              }}
              title="Connect nodes"
              style={{
                display: "flex", alignItems: "center", gap: 6, background: "none",
                border: connectMode ? "1px solid #FF8A4C" : "1px solid #2E2E33",
                borderRadius: 999, color: connectMode ? "#FF8A4C" : "#8B8B93",
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600,
                padding: "6px 12px", cursor: "pointer",
              }}
            >
              <Link2 size={13} /> {connectMode ? "Connecting…" : "Connect"}
            </button>
          )}
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8B93" }}>
            <X size={18} />
          </button>
        </div>

        {!currentBoardId ? (
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <input
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createBoard()}
                placeholder="New board name…"
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #2E2E33", background: "#16161A", color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, outline: "none" }}
              />
              <button onClick={createBoard} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#FF8A4C", color: "#16161A", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <Plus size={16} />
              </button>
            </div>
            {boards.length === 0 ? (
              <div style={{ textAlign: "center", color: "#8B8B93", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, marginTop: 20 }}>
                No boards yet. Create one above.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {boards.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setCurrentBoardId(b.id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "#16161A", border: "1px solid #2E2E33", borderRadius: 10,
                      padding: "12px 14px", cursor: "pointer",
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 14, color: "#EDEDEF" }}>{b.name}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8B8B93", marginTop: 2 }}>started by {b.createdBy}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBoard(b.id);
                      }}
                      style={{ background: "none", border: "none", color: "#5C5C63", cursor: "pointer", display: "flex" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ padding: "8px 20px" }}>
              <button
                onClick={addNode}
                style={{
                  display: "flex", alignItems: "center", gap: 6, background: "none",
                  border: "1px solid #2E2E33", borderRadius: 999, color: "#8B8B93",
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600,
                  padding: "6px 12px", cursor: "pointer",
                }}
              >
                <Plus size={13} /> Add idea
              </button>
              {connectMode && (
                <span style={{ marginLeft: 12, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#8B8B93" }}>
                  {connectFromId ? "Now click the idea to connect it to." : "Click an idea to start connecting."}
                </span>
              )}
            </div>

            <div style={{ flex: 1, position: "relative", overflow: "auto", margin: "0 20px 20px", background: "#16161A", border: "1px solid #2E2E33", borderRadius: 12 }}>
              <div style={{ position: "relative", width: 1200, height: 800 }}>
                <svg width={1200} height={800} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
                  {edges.map((edge) => {
                    const fromNode = nodes.find((n) => n.id === edge.from);
                    const toNode = nodes.find((n) => n.id === edge.to);
                    if (!fromNode || !toNode) return null;
                    const fromPos = positionOf(fromNode);
                    const toPos = positionOf(toNode);
                    const x1 = fromPos.x + NODE_WIDTH / 2;
                    const y1 = fromPos.y + NODE_HEIGHT / 2;
                    const x2 = toPos.x + NODE_WIDTH / 2;
                    const y2 = toPos.y + NODE_HEIGHT / 2;
                    return (
                      <line
                        key={edge.id}
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke="#FF8A4C"
                        strokeWidth={2}
                        style={{ pointerEvents: "stroke", cursor: "pointer" }}
                        onClick={() => deleteEdge(edge.id)}
                      />
                    );
                  })}
                </svg>

                {nodes.map((node) => {
                  const pos = positionOf(node);
                  const isEditing = editingNodeId === node.id;
                  const isConnectSource = connectFromId === node.id;
                  return (
                    <div
                      key={node.id}
                      onPointerDown={(e) => handlePointerDown(e, node)}
                      onClick={() => handleNodeClick(node)}
                      onDoubleClick={() => !connectMode && startEditNode(node)}
                      style={{
                        position: "absolute",
                        left: pos.x,
                        top: pos.y,
                        width: NODE_WIDTH,
                        minHeight: NODE_HEIGHT,
                        background: "#1C1C1F",
                        border: isConnectSource ? "2px solid #FF8A4C" : "1px solid #2E2E33",
                        borderRadius: 10,
                        padding: "8px 10px",
                        cursor: connectMode ? "pointer" : "grab",
                        userSelect: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                      }}
                    >
                      {isEditing ? (
                        <textarea
                          autoFocus
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onBlur={saveNodeText}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              saveNodeText();
                            }
                          }}
                          style={{
                            width: "100%", background: "transparent", border: "none", outline: "none",
                            color: "#EDEDEF", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, resize: "none",
                          }}
                        />
                      ) : (
                        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#EDEDEF", lineHeight: 1.4, wordBreak: "break-word" }}>
                          {node.text}
                        </div>
                      )}
                      {!connectMode && !isEditing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNode(node.id);
                          }}
                          style={{
                            position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: "50%",
                            background: "#26262B", border: "1px solid #2E2E33", color: "#8B8B93",
                            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
