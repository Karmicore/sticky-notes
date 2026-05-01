import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

const COLORS = [
  "#FFEB3B", "#BBDEFB", "#C8E6C9", "#F8BBD9",
  "#E1BEE7", "#FFE0B2", "#FFFFFF", "#90CAF9",
  "#A5D6A7", "#EF9A9A", "#F48FB1", "#E0E0E0",
];
const OPACITIES = [20, 30, 40, 50, 60, 70, 80, 90, 100];
const appWindow = getCurrentWindow();

function getNoteId() {
  const label = appWindow.label;
  return label.startsWith("note-") ? parseInt(label.slice(5), 10) : null;
}

export default function App() {
  const [note, setNote] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [menu, setMenu] = useState(null);
  const noteRef = useRef(null);
  const saveTimer = useRef(null);
  const deleting = useRef(false);

  useEffect(() => { noteRef.current = note; }, [note]);

  // Load note
  useEffect(() => {
    const id = getNoteId();
    if (id === null) return;
    invoke("get_note", { id })
      .then((n) => setNote({ ...n, locked: n.locked || false }))
      .catch(console.error);
  }, []);

  // Save on tray quit
  useEffect(() => {
    const id = getNoteId();
    if (id === null) return;
    const unlisten = listen("quit-app", async () => {
      if (noteRef.current) {
        await invoke("save_note", { note: noteRef.current }).catch(() => {});
      }
      await appWindow.close();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!note) return;
    function onKey(e) {
      const c = e.ctrlKey || e.metaKey;
      if (c && e.code === "KeyN") { e.preventDefault(); invoke("create_note_window"); }
      else if (c && e.code === "KeyD") { e.preventDefault(); invoke("duplicate_note", { sourceId: note.id }); }
      else if (e.code === "F2") { e.preventDefault(); setEditingTitle(true); }
      else if (c && e.code === "KeyL") { e.preventDefault(); update({ locked: !noteRef.current.locked }); }
      else if (c && e.shiftKey && e.code === "ArrowUp") { e.preventDefault(); changeOpacity(10); }
      else if (c && e.shiftKey && e.code === "ArrowDown") { e.preventDefault(); changeOpacity(-10); }
      else if (c && (e.code === "Equal" || e.code === "NumpadAdd")) { e.preventDefault(); changeFontSize(1); }
      else if (c && (e.code === "Minus" || e.code === "NumpadSubtract")) { e.preventDefault(); changeFontSize(-1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [note]);

  function update(changes) {
    setNote((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...changes };
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        invoke("save_note", { note: updated }).catch(() => {});
      }, 800);
      return updated;
    });
  }

  function changeFontSize(delta) {
    const n = noteRef.current;
    if (!n) return;
    update({ fontSize: Math.min(72, Math.max(8, n.fontSize + delta)) });
  }

  function changeOpacity(delta) {
    const n = noteRef.current;
    if (!n) return;
    const next = Math.min(100, Math.max(10, Math.round(n.opacity * 100) + delta));
    update({ opacity: next / 100 });
  }

  async function handleClose() {
    // Save immediately, then close
    if (noteRef.current) {
      invoke("save_note", { note: noteRef.current }).catch(() => {});
    }
    await appWindow.close();
  }

  async function handleDelete() {
    deleting.current = true;
    try {
      await invoke("delete_note", { id: note.id });
      await appWindow.close();
    } catch (e) {
      console.error(e);
      deleting.current = false;
    }
  }

  async function handlePin() {
    const val = !note.isAlwaysOnTop;
    await invoke("set_window_always_on_top", { onTop: val }).catch(console.error);
    update({ isAlwaysOnTop: val });
  }

  function commitTitle(value) {
    const t = value.trim();
    if (t) { update({ title: t }); appWindow.setTitle(t); }
    setEditingTitle(false);
  }

  if (!note) return null;

  return (
    <div className="note-window" style={{ backgroundColor: note.color, opacity: note.opacity }}>
      {/* data-tauri-drag-region: children DON'T inherit, so buttons stay clickable */}
      <div className="title-bar" data-tauri-drag-region>
        <button className="title-btn menu-btn" onClick={() => setMenu(menu ? null : "main")}>⋮</button>
        {editingTitle ? (
          <input className="title-input" type="text" defaultValue={note.title} autoFocus
            onBlur={(e) => commitTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commitTitle(e.target.value); if (e.key === "Escape") setEditingTitle(false); }} />
        ) : (
          <span className="title-text" onDoubleClick={() => setEditingTitle(true)}>{note.title}</span>
        )}
        <div className="title-actions">
          <button className="title-btn close-btn" onClick={handleClose}>×</button>
        </div>
      </div>

      <textarea className="text-content" value={note.content} placeholder="输入内容..."
        readOnly={note.locked} style={{ fontSize: note.fontSize + "px" }}
        onChange={(e) => !note.locked && update({ content: e.target.value })} />

      <div className="resize-grip" />

      {menu && (
        <NoteMenu note={note} onClose={() => setMenu(null)}
          onNew={() => invoke("create_note_window")}
          onDup={() => invoke("duplicate_note", { sourceId: note.id })}
          onDelete={handleDelete} onHide={() => appWindow.hide()}
          onPin={handlePin} onLock={() => update({ locked: !note.locked })}
          onRename={() => setEditingTitle(true)}
          onFontUp={() => changeFontSize(1)} onFontDown={() => changeFontSize(-1)}
          onColor={(c) => update({ color: c })} onOpacity={(v) => update({ opacity: v / 100 })} />
      )}
    </div>
  );
}

function NoteMenu({ note, onClose, onNew, onDup, onDelete, onHide, onPin, onLock, onRename, onFontUp, onFontDown, onColor, onOpacity }) {
  const [sub, setSub] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const I = (label, key, fn, danger) => (
    <div className={`ctx-item${danger ? " ctx-danger" : ""}`} onClick={() => { fn(); onClose(); }}>
      <span className="ctx-label">{label}</span>{key && <span className="ctx-shortcut">{key}</span>}
    </div>
  );

  return (
    <div ref={ref} className="context-menu" onClick={(e) => e.stopPropagation()}>
      {I("新建便签", "Ctrl+N", onNew)}
      {I("复制便签", "Ctrl+D", onDup)}
      {I("重命名", "F2", onRename)}
      <div className="ctx-separator" />
      {I("删除", "", onDelete, true)}
      {I("隐藏", "", onHide)}
      <div className="ctx-separator" />
      {I("始终置顶", note.isAlwaysOnTop ? "✓" : "", onPin)}
      {I("锁定便签", note.locked ? "✓" : "", onLock)}
      <div className="ctx-separator" />
      {I("字体增大", "Ctrl++", onFontUp)}
      {I("字体减小", "Ctrl+-", onFontDown)}
      <div className="ctx-item ctx-has-sub" onMouseEnter={() => setSub("op")} onMouseLeave={() => setSub(null)}>
        <span className="ctx-label">透明度</span><span className="ctx-arrow">▸</span>
        {sub === "op" && <div className="ctx-submenu">
          {OPACITIES.map((v) => <div key={v} className={`ctx-sub-item${Math.round(note.opacity * 100) === v ? " active" : ""}`} onClick={() => { onOpacity(v); onClose(); }}>{v}%</div>)}
        </div>}
      </div>
      <div className="ctx-item ctx-has-sub" onMouseEnter={() => setSub("co")} onMouseLeave={() => setSub(null)}>
        <span className="ctx-label">颜色</span><span className="ctx-arrow">▸</span>
        {sub === "co" && <div className="ctx-submenu ctx-color-grid">
          {COLORS.map((c) => <div key={c} className={`ctx-color-swatch${note.color === c ? " active" : ""}`} style={{ backgroundColor: c }} onClick={() => { onColor(c); onClose(); }} />)}
        </div>}
      </div>
    </div>
  );
}
