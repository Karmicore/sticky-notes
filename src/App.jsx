import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

const COLORS = [
  "#FFEB3B", "#BBDEFB", "#C8E6C9", "#F8BBD9",
  "#E1BEE7", "#FFE0B2", "#FFFFFF", "#90CAF9",
  "#A5D6A7", "#EF9A9A", "#F48FB1", "#E0E0E0",
];

const OPACITIES = [20, 30, 40, 50, 60, 70, 80, 90, 100];

function getNoteId() {
  const label = getCurrentWindow().label;
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

  // Load note + close handler
  useEffect(() => {
    const id = getNoteId();
    if (id === null) return;
    invoke("get_note", { id }).then((n) => {
      setNote({ ...n, locked: n.locked || false });
    }).catch(console.error);
    const unlisten = getCurrentWindow().onCloseRequested(async (e) => {
      if (deleting.current) return;
      e.preventDefault();
      if (noteRef.current) {
        await invoke("save_note", { note: noteRef.current }).catch(() => {});
      }
      await getCurrentWindow().close();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!note) return;
    function onKey(e) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.code === "KeyN") { e.preventDefault(); invoke("create_note_window"); }
      else if (ctrl && e.code === "KeyD") { e.preventDefault(); invoke("duplicate_note", { sourceId: note.id }); }
      else if (e.code === "F2") { e.preventDefault(); setEditingTitle(true); }
      else if (ctrl && e.code === "KeyL") { e.preventDefault(); update({ locked: !noteRef.current.locked }); }
      else if (ctrl && e.shiftKey && e.code === "ArrowUp") { e.preventDefault(); setOpacity(10); }
      else if (ctrl && e.shiftKey && e.code === "ArrowDown") { e.preventDefault(); setOpacity(-10); }
      else if (ctrl && (e.code === "Equal" || e.code === "NumpadAdd")) { e.preventDefault(); setFontSize(1); }
      else if (ctrl && (e.code === "Minus" || e.code === "NumpadSubtract")) { e.preventDefault(); setFontSize(-1); }
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

  function setFontSize(delta) {
    const cur = noteRef.current;
    if (!cur) return;
    const next = Math.min(72, Math.max(8, cur.fontSize + delta));
    update({ fontSize: next });
  }

  function setOpacity(delta) {
    const cur = noteRef.current;
    if (!cur) return;
    const next = Math.min(100, Math.max(10, Math.round(cur.opacity * 100) + delta));
    update({ opacity: next / 100 });
  }

  async function handleClose() { await getCurrentWindow().close(); }

  async function handleDelete() {
    deleting.current = true;
    try { await invoke("delete_note", { id: note.id }); await getCurrentWindow().close(); }
    catch (e) { console.error(e); deleting.current = false; }
  }

  async function handlePin() {
    const val = !note.isAlwaysOnTop;
    await invoke("set_window_always_on_top", { onTop: val }).catch(console.error);
    update({ isAlwaysOnTop: val });
  }

  function handleTitleCommit(value) {
    const t = value.trim();
    if (t) { update({ title: t }); getCurrentWindow().setTitle(t); }
    setEditingTitle(false);
  }

  // Drag: only start if click is NOT on a button or input
  function handleTitleMouseDown(e) {
    if (e.target.closest(".title-btn") || e.target.closest(".title-input")) return;
    if (e.buttons === 1) getCurrentWindow().startDragging();
  }

  if (!note) return null;

  return (
    <div className="note-window" style={{ backgroundColor: note.color, opacity: note.opacity }}>
      <div className="title-bar" onMouseDown={handleTitleMouseDown}>
        <button className="title-btn menu-btn" onClick={() => setMenu(menu ? null : "main")} title="菜单">⋮</button>

        {editingTitle ? (
          <input className="title-input" type="text" defaultValue={note.title} autoFocus
            onBlur={(e) => handleTitleCommit(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleTitleCommit(e.target.value); if (e.key === "Escape") setEditingTitle(false); }}
            onClick={(e) => e.stopPropagation()} />
        ) : (
          <span className="title-text" onDoubleClick={() => setEditingTitle(true)}>{note.title}</span>
        )}

        <div className="title-actions">
          <button className="title-btn close-btn" onClick={handleClose} title="关闭">×</button>
        </div>
      </div>

      <textarea className="text-content" value={note.content} placeholder="输入内容..."
        readOnly={note.locked} style={{ fontSize: note.fontSize + "px" }}
        onChange={(e) => !note.locked && update({ content: e.target.value })} />

      <div className="resize-grip" />

      {menu && (
        <NoteMenu note={note} onClose={() => setMenu(null)}
          onNew={() => invoke("create_note_window")}
          onDuplicate={() => invoke("duplicate_note", { sourceId: note.id })}
          onDelete={handleDelete} onHide={() => getCurrentWindow().hide()}
          onPin={handlePin} onLock={() => update({ locked: !note.locked })}
          onRename={() => setEditingTitle(true)}
          onFontSizeUp={() => setFontSize(1)} onFontSizeDown={() => setFontSize(-1)}
          onColor={(c) => update({ color: c })} onOpacity={(v) => update({ opacity: v / 100 })} />
      )}
    </div>
  );
}

function NoteMenu({ note, onClose, onNew, onDuplicate, onDelete, onHide, onPin, onLock, onRename, onFontSizeUp, onFontSizeDown, onColor, onOpacity }) {
  const [sub, setSub] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  function item(label, shortcut, action, danger) {
    return (
      <div className={`ctx-item${danger ? " ctx-danger" : ""}`} onClick={() => { action(); onClose(); }}>
        <span className="ctx-label">{label}</span>
        {shortcut && <span className="ctx-shortcut">{shortcut}</span>}
      </div>
    );
  }

  return (
    <div ref={ref} className="context-menu" onClick={(e) => e.stopPropagation()}>
      {item("新建便签", "Ctrl+N", onNew)}
      {item("复制便签", "Ctrl+D", onDuplicate)}
      {item("重命名", "F2", onRename)}
      <div className="ctx-separator" />
      {item("删除", "", onDelete, true)}
      {item("隐藏", "", onHide)}
      <div className="ctx-separator" />
      {item("始终置顶", note.isAlwaysOnTop ? "✓" : "", onPin)}
      {item("锁定便签", note.locked ? "✓" : "", onLock)}
      <div className="ctx-separator" />

      <div className="ctx-item" onClick={() => { onFontSizeUp(); onClose(); }}>
        <span className="ctx-label">字体增大</span><span className="ctx-shortcut">Ctrl++</span>
      </div>
      <div className="ctx-item" onClick={() => { onFontSizeDown(); onClose(); }}>
        <span className="ctx-label">字体减小</span><span className="ctx-shortcut">Ctrl+-</span>
      </div>

      <div className="ctx-item ctx-has-sub" onMouseEnter={() => setSub("opacity")} onMouseLeave={() => setSub(null)}>
        <span className="ctx-label">透明度</span><span className="ctx-arrow">▸</span>
        {sub === "opacity" && (
          <div className="ctx-submenu">
            {OPACITIES.map((v) => (
              <div key={v} className={`ctx-sub-item${Math.round(note.opacity * 100) === v ? " active" : ""}`}
                onClick={() => { onOpacity(v); onClose(); }}>{v}%</div>
            ))}
          </div>
        )}
      </div>

      <div className="ctx-item ctx-has-sub" onMouseEnter={() => setSub("color")} onMouseLeave={() => setSub(null)}>
        <span className="ctx-label">颜色</span><span className="ctx-arrow">▸</span>
        {sub === "color" && (
          <div className="ctx-submenu ctx-color-grid">
            {COLORS.map((c) => (
              <div key={c} className={`ctx-color-swatch${note.color === c ? " active" : ""}`}
                style={{ backgroundColor: c }} onClick={() => { onColor(c); onClose(); }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
