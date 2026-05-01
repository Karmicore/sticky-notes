import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

const COLORS = [
  { name: "黄", hex: "#FFEB3B" },
  { name: "蓝", hex: "#BBDEFB" },
  { name: "绿", hex: "#C8E6C9" },
  { name: "粉", hex: "#F8BBD9" },
  { name: "白", hex: "#FFFFFF" },
];

export default function App() {
  const [notes, setNotes] = useState([]);
  const [settingsNote, setSettingsNote] = useState(null);
  const saveTimers = useRef({});

  const loadNotes = useCallback(async () => {
    try {
      const loaded = await invoke("load_notes");
      const mapped = loaded.map((n) => ({ ...n, visible: n.visible !== false }));
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
        const win = getCurrentWindow();
        setNotes((prev) => {
          prev.forEach((n) => invoke("save_note", { note: n }).catch(() => {}));
          return prev;
        });
        await win.close();
      }),
    ];

    return () => {
      unlisteners.forEach((u) => u.then((fn) => fn()));
    };
  }, []);

  function createNoteSync(prev) {
    const id = prev.length;
    const offset = prev.length * 25;
    const x = (100 + offset) % Math.max(window.innerWidth - 200, 200);
    const y = (100 + Math.floor(offset / 10) * 25) % Math.max(window.innerHeight - 200, 200);

    const newNote = {
      id,
      title: `便签 ${id + 1}`,
      content: "",
      color: "#FFEB3B",
      x,
      y,
      width: 260,
      height: 320,
      isAlwaysOnTop: true,
      fontSize: 14,
      opacity: 1.0,
      visible: true,
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
        id,
        title: `便签 ${id + 1}`,
        content: "",
        color: "#FFEB3B",
        x,
        y,
        width: 260,
        height: 320,
        isAlwaysOnTop: true,
        fontSize: 14,
        opacity: 1.0,
        visible: true,
      };

      await invoke("save_note", { note: newNote });
      setNotes((prev) => [...prev, newNote]);
    } catch (e) {
      console.error("Failed to create note:", e);
    }
  }

  function updateNote(note, changes) {
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, ...changes } : n))
    );

    clearTimeout(saveTimers.current[note.id]);
    saveTimers.current[note.id] = setTimeout(() => {
      const updated = { ...note, ...changes };
      invoke("save_note", { note: updated }).catch(() => {});
    }, 800);
  }

  async function deleteNote(note) {
    try {
      await invoke("delete_note", { id: note.id });
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== note.id);
        if (next.length === 0) {
          createNote([]);
        }
        return next;
      });
      if (settingsNote?.id === note.id) {
        setSettingsNote(null);
      }
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

  async function hideNote(note) {
    updateNote(note, { visible: false });
  }

  async function closeWindow() {
    const win = getCurrentWindow();
    await win.hide();
  }

  async function startDrag(note, event) {
    if (event.target.closest(".title-btn") || event.target.closest(".text-content")) return;
    const win = getCurrentWindow();
    await win.startDragging();
  }

  return (
    <div className="app-container" onClick={() => setSettingsNote(null)}>
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
            >
              <div className="title-bar">
                <button
                  className={`title-btn pin-btn${note.isAlwaysOnTop ? " pinned" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(note);
                  }}
                  title={note.isAlwaysOnTop ? "取消置顶" : "置顶"}
                >
                  {note.isAlwaysOnTop ? "📌" : "○"}
                </button>

                <span className="title-text" onDoubleClick={(e) => { e.stopPropagation(); setSettingsNote(note); }}>
                  {note.title}
                </span>

                <div className="title-actions">
                  <button className="title-btn" onClick={(e) => { e.stopPropagation(); setSettingsNote(note); }} title="设置">⋮</button>
                  <button className="title-btn" onClick={(e) => { e.stopPropagation(); hideNote(note); }} title="最小化">−</button>
                  <button className="title-btn delete-btn" onClick={(e) => { e.stopPropagation(); deleteNote(note); }} title="删除">🗑</button>
                  <button className="title-btn" onClick={(e) => { e.stopPropagation(); closeWindow(); }} title="关闭">×</button>
                </div>
              </div>

              <textarea
                className="text-content"
                value={note.content}
                placeholder="输入内容..."
                style={{ fontSize: note.fontSize + "px" }}
                onChange={(e) => updateNote(note, { content: e.target.value })}
              />

              <div className="resize-grip" />
            </div>
          )
        )}
      </div>

      {settingsNote && (
        <div className="settings-overlay" onClick={(e) => { e.stopPropagation(); setSettingsNote(null); }}>
          <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>设置</h3>

            <div className="setting-row">
              <label>标题</label>
              <input
                type="text"
                value={settingsNote.title}
                onChange={(e) => updateNote(settingsNote, { title: e.target.value })}
              />
            </div>

            <div className="setting-row">
              <label>不透明度</label>
              <input
                type="range"
                min="30"
                max="100"
                value={Math.round(settingsNote.opacity * 100)}
                onChange={(e) => updateNote(settingsNote, { opacity: parseInt(e.target.value) / 100 })}
              />
              <span>{Math.round(settingsNote.opacity * 100)}%</span>
            </div>

            <div className="setting-row">
              <label>字体大小</label>
              <input
                type="number"
                min="8"
                max="30"
                value={settingsNote.fontSize}
                onChange={(e) => updateNote(settingsNote, { fontSize: parseInt(e.target.value) || 14 })}
              />
            </div>

            <div className="setting-row">
              <label>置顶</label>
              <input
                type="checkbox"
                checked={settingsNote.isAlwaysOnTop}
                onChange={() => togglePin(settingsNote)}
              />
            </div>

            <div className="setting-row">
              <label>颜色</label>
              <div className="color-buttons">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    className={`color-btn${settingsNote.color === c.hex ? " active" : ""}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => updateNote(settingsNote, { color: c.hex })}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <button className="close-settings-btn" onClick={() => setSettingsNote(null)}>确定</button>
          </div>
        </div>
      )}

      <div className="tray-hint">
        <button onClick={() => createNote(notes)} title="新建便签">+ 新建</button>
        <button onClick={() => setNotes((prev) => prev.map((n) => ({ ...n, visible: true })))} title="显示全部">👁 显示</button>
        <button onClick={() => setNotes((prev) => prev.map((n) => ({ ...n, visible: false })))} title="隐藏全部">👁 隐藏</button>
      </div>
    </div>
  );
}
