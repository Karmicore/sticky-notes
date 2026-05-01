import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

const COLORS = [
  { hex: "#FFEB3B" }, { hex: "#BBDEFB" }, { hex: "#C8E6C9" }, { hex: "#F8BBD9" },
  { hex: "#E1BEE7" }, { hex: "#FFE0B2" }, { hex: "#FFFFFF" }, { hex: "#90CAF9" },
  { hex: "#A5D6A7" }, { hex: "#EF9A9A" }, { hex: "#F48FB1" }, { hex: "#E0E0E0" },
];

const OPACITIES = [20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function App() {
  const [notes, setNotes] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingTitle, setEditingTitle] = useState(null);
  const saveTimers = useRef({});

  const loadNotes = useCallback(async () => {
    try {
      const loaded = await invoke("load_notes");
      const mapped = loaded.map((n) => ({ ...n, visible: n.visible !== false, locked: n.locked || false }));
      if (mapped.length === 0) {
        await createNote(mapped);
      } else {
        setNotes(mapped);
      }
    } catch (e) {
      console.error("Failed to load notes:", e);
      await createNote([]);
    }
  }, []);

  useEffect(() => {
    loadNotes();
    const unlisteners = [
      listen("show-all", () => setNotes((prev) => prev.map((n) => ({ ...n, visible: true })))),
      listen("hide-all", () => setNotes((prev) => prev.map((n) => ({ ...n, visible: false })))),
      listen("create-note", () => setNotes((prev) => createNoteSync(prev))),
      listen("quit-app", async () => {
        setNotes((prev) => {
          prev.forEach((n) => invoke("save_note", { note: n }).catch(() => {}));
          return prev;
        });
        await getCurrentWindow().close();
      }),
    ];
    return () => unlisteners.forEach((u) => u.then((fn) => fn()));
  }, []);

  function createNoteSync(prev) {
    const id = prev.length;
    const offset = prev.length * 25;
    const x = (100 + offset) % Math.max(window.innerWidth - 200, 200);
    const y = (100 + Math.floor(offset / 10) * 25) % Math.max(window.innerHeight - 200, 200);
    const newNote = {
      id, title: `便签 ${id + 1}`, content: "", color: "#FFEB3B",
      x, y, width: 260, height: 320, isAlwaysOnTop: true,
      fontSize: 14, opacity: 1.0, visible: true, locked: false,
    };
    invoke("save_note", { note: newNote }).catch(() => {});
    return [...prev, newNote];
  }

  async function createNote(currentNotes) {
    try {
      const id = await invoke("get_next_id");
      const len = currentNotes ? currentNotes.length : 0;
      const offset = len * 25;
      const x = (100 + offset) % Math.max(window.innerWidth - 200, 200);
      const y = (100 + Math.floor(offset / 10) * 25) % Math.max(window.innerHeight - 200, 200);
      const newNote = {
        id, title: `便签 ${id + 1}`, content: "", color: "#FFEB3B",
        x, y, width: 260, height: 320, isAlwaysOnTop: true,
        fontSize: 14, opacity: 1.0, visible: true, locked: false,
      };
      await invoke("save_note", { note: newNote });
      setNotes((prev) => [...prev, newNote]);
    } catch (e) {
      console.error("Failed to create note:", e);
    }
  }

  function updateNote(note, changes) {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, ...changes } : n)));
    clearTimeout(saveTimers.current[note.id]);
    saveTimers.current[note.id] = setTimeout(() => {
      invoke("save_note", { note: { ...note, ...changes } }).catch(() => {});
    }, 800);
  }

  async function deleteNote(note) {
    try {
      await invoke("delete_note", { id: note.id });
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== note.id);
        if (next.length === 0) createNote([]);
        return next;
      });
    } catch (e) {
      console.error("Failed to delete note:", e);
    }
  }

  async function togglePin(note) {
    const newVal = !note.isAlwaysOnTop;
    try {
      await invoke("set_window_always_on_top", { onTop: newVal });
      updateNote(note, { isAlwaysOnTop: newVal });
    } catch (e) {
      console.error("Failed to toggle pin:", e);
    }
  }

  function hideNote(note) {
    updateNote(note, { visible: false });
  }

  async function closeWindow() {
    await getCurrentWindow().hide();
  }

  async function startDrag(note, event) {
    if (event.target.closest(".title-btn") || event.target.closest(".text-content")) return;
    await getCurrentWindow().startDragging();
  }

  function openContextMenu(e, note) {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 400);
    setContextMenu({ x, y, note });
  }

  function handleTitleDblClick(e, note) {
    e.stopPropagation();
    setEditingTitle(note.id);
  }

  function handleTitleChange(note, newTitle) {
    if (newTitle.trim()) {
      updateNote(note, { title: newTitle.trim() });
    }
    setEditingTitle(null);
  }

  return (
    <div className="app-container" onClick={() => setContextMenu(null)}>
      <div className="notes-area">
        {notes.map((note) =>
          !note.visible ? null : (
            <div
              key={note.id}
              className="note-window"
              style={{
                backgroundColor: note.color,
                left: note.x + "px",
                top: note.y + "px",
                width: note.width + "px",
                height: note.height + "px",
                opacity: note.opacity,
              }}
              onMouseDown={(e) => startDrag(note, e)}
              onContextMenu={(e) => openContextMenu(e, note)}
            >
              <div className="title-bar">
                <button
                  className="title-btn new-btn"
                  onClick={(e) => { e.stopPropagation(); createNote(notes); }}
                  title="新建便签"
                >+</button>

                {editingTitle === note.id ? (
                  <input
                    className="title-input"
                    type="text"
                    defaultValue={note.title}
                    autoFocus
                    onBlur={(e) => handleTitleChange(note, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleTitleChange(note, e.target.value);
                      if (e.key === "Escape") setEditingTitle(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="title-text"
                    onDoubleClick={(e) => handleTitleDblClick(e, note)}
                  >
                    {note.title}
                  </span>
                )}

                <div className="title-actions">
                  <button className="title-btn" onClick={(e) => { e.stopPropagation(); hideNote(note); }} title="最小化">−</button>
                  <button className="title-btn close-btn" onClick={(e) => { e.stopPropagation(); closeWindow(); }} title="关闭">×</button>
                </div>
              </div>

              <textarea
                className="text-content"
                value={note.content}
                placeholder="输入内容..."
                readOnly={note.locked}
                style={{ fontSize: note.fontSize + "px" }}
                onChange={(e) => !note.locked && updateNote(note, { content: e.target.value })}
              />

              <div className="resize-grip" />
            </div>
          )
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          note={contextMenu.note}
          onClose={() => setContextMenu(null)}
          onNew={() => createNote(notes)}
          onDelete={deleteNote}
          onHide={hideNote}
          onTogglePin={togglePin}
          onToggleLock={(n) => updateNote(n, { locked: !n.locked })}
          onColor={(n, hex) => updateNote(n, { color: hex })}
          onOpacity={(n, val) => updateNote(n, { opacity: val / 100 })}
        />
      )}
    </div>
  );
}

function ContextMenu({ x, y, note, onClose, onNew, onDelete, onHide, onTogglePin, onToggleLock, onColor, onOpacity }) {
  const [submenu, setSubmenu] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className="context-menu" style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
      <div className="ctx-item" onClick={() => { onNew(); onClose(); }}>
        <span className="ctx-icon">+</span><span>New Note</span>
      </div>
      <div className="ctx-separator" />
      <div className="ctx-item ctx-danger" onClick={() => { onDelete(note); onClose(); }}>
        <span className="ctx-icon"></span><span>Delete</span>
      </div>
      <div className="ctx-item" onClick={() => { onHide(note); onClose(); }}>
        <span className="ctx-icon"></span><span>Hide</span>
      </div>
      <div className="ctx-separator" />
      <div className="ctx-item" onClick={() => { onTogglePin(note); onClose(); }}>
        <span className="ctx-icon">{note.isAlwaysOnTop ? "✓" : ""}</span><span>Always on Top</span>
      </div>
      <div className="ctx-item" onClick={() => { onToggleLock(note); onClose(); }}>
        <span className="ctx-icon">{note.locked ? "✓" : ""}</span><span>Lock Note</span>
      </div>
      <div className="ctx-separator" />
      <div className="ctx-item ctx-has-sub" onMouseEnter={() => setSubmenu("opacity")} onMouseLeave={() => setSubmenu(null)}>
        <span className="ctx-icon"></span><span>Opacity</span><span className="ctx-arrow">▸</span>
        {submenu === "opacity" && (
          <div className="ctx-submenu">
            {OPACITIES.map((v) => (
              <div key={v} className={`ctx-sub-item${Math.round(note.opacity * 100) === v ? " active" : ""}`} onClick={() => { onOpacity(note, v); onClose(); }}>{v}%</div>
            ))}
          </div>
        )}
      </div>
      <div className="ctx-item ctx-has-sub" onMouseEnter={() => setSubmenu("color")} onMouseLeave={() => setSubmenu(null)}>
        <span className="ctx-icon"></span><span>Color</span><span className="ctx-arrow">▸</span>
        {submenu === "color" && (
          <div className="ctx-submenu ctx-color-grid">
            {COLORS.map((c) => (
              <div key={c.hex} className={`ctx-color-swatch${note.color === c.hex ? " active" : ""}`} style={{ backgroundColor: c.hex }} onClick={() => { onColor(note, c.hex); onClose(); }} />
            ))}
          </div>
        )}
      </div>
      <div className="ctx-separator" />
      <div className="ctx-item ctx-disabled"><span className="ctx-icon"></span><span>Alarm...</span></div>
      <div className="ctx-item ctx-disabled"><span className="ctx-icon"></span><span>Print</span></div>
    </div>
  );
}
