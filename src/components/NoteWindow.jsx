import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import NoteMenu from "./NoteMenu";

const appWindow = getCurrentWindow();

export default function NoteWindow({ note, update, changeFontSize, changeOpacity }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [menu, setMenu] = useState(null);
  const deleting = useRef(false);
  const titleBarRef = useRef(null);

  // F2 to rename
  useEffect(() => {
    function onKey(e) {
      if (e.code === "F2") { e.preventDefault(); setEditingTitle(true); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Title bar drag — native DOM listener per Tauri 2.x official docs
  useEffect(() => {
    const el = titleBarRef.current;
    if (!el) return;

    function onMouseDown(e) {
      // Only left button, skip buttons/inputs
      if (e.buttons !== 1) return;
      if (e.target.closest("button") || e.target.closest("input")) return;
      e.detail === 2
        ? appWindow.toggleMaximize().catch(() => {})
        : appWindow.startDragging();
    }

    el.addEventListener("mousedown", onMouseDown);
    return () => el.removeEventListener("mousedown", onMouseDown);
  }, []);

  const handleClose = useCallback(async () => {
    try {
      await invoke("save_note", { note });
    } catch (e) {
      console.error("save before close failed:", e);
    }
    appWindow.close();
  }, [note]);

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

  return (
    <div className="note-window" style={{ backgroundColor: note.color, opacity: note.opacity }}>
      <div className="title-bar" ref={titleBarRef}>
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
