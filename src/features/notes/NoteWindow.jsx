import { useState, useRef, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useKeyboard } from "./hooks/useKeyboard";
import TitleBar from "./TitleBar";
import NoteEditor from "./NoteEditor";
import ColorPanel from "./ColorPanel";
import { popupNativeMenu } from "../../lib/nativeMenu";
import { hexToRgba } from "../../lib/color";
import styles from "./styles/NoteWindow.module.css";

const appWindow = getCurrentWindow();

export default function NoteWindow({ noteId, note, update, edit, saveNow, cancel }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [focused, setFocused] = useState(true);
  const [activePanel, setActivePanel] = useState(null);
  const noteRef = useRef(note);
  const insertCheckboxRef = useRef(null);
  noteRef.current = note;

  useEffect(() => {
    const unlisten = appWindow.onFocusChanged(({ payload }) => setFocused(payload));
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Stable callbacks — read from refs, never stale
  const handleDelete = useCallback(async () => {
    try {
      cancel();
      await invoke("delete_note", { id: noteRef.current.id });
      await appWindow.close();
    } catch (e) {
      console.error(e);
    }
  }, [cancel]);

  const handlePin = useCallback(async () => {
    const val = !noteRef.current.isAlwaysOnTop;
    await invoke("set_window_always_on_top", { onTop: val }).catch(console.error);
    edit({ isAlwaysOnTop: val });
  }, [edit]);

  const handleClose = useCallback(async () => {
    await saveNow();
    appWindow.hide();
  }, [saveNow]);

  const changeFontSize = useCallback((delta) => {
    const cur = noteRef.current.fontSize;
    edit({ fontSize: Math.min(72, Math.max(8, cur + delta)) });
  }, [edit]);

  const changeOpacity = useCallback((delta) => {
    const cur = Math.round(noteRef.current.opacity * 100);
    const next = Math.min(100, Math.max(10, cur + delta));
    edit({ opacity: next / 100 });
  }, [edit]);

  const handleCollapseToggle = useCallback(async () => {
    try {
      const updated = await invoke("toggle_note_collapsed", { noteId: noteRef.current.id });
      edit({ collapsed: updated.collapsed });
    } catch (e) {
      console.error(e);
    }
  }, [edit]);

  // Context builder — always reads fresh state from refs
  const getCtx = useCallback(() => ({
    noteId,
    note: noteRef.current,
    update: edit,
    changeFontSize,
    changeOpacity,
    setEditingTitle,
    onDelete: handleDelete,
    onHide: () => appWindow.hide(),
    onPin: handlePin,
    insertCheckbox: () => insertCheckboxRef.current?.(),
    showColorPanel: () => setActivePanel("color"),
    showOpacityPanel: () => setActivePanel("opacity"),
  }), [noteId, edit, changeFontSize, changeOpacity, handleDelete, handlePin]);

  useKeyboard(getCtx);

  function commitTitle(value) {
    const t = value.trim();
    if (t) { edit({ title: t }); appWindow.setTitle(t); }
    setEditingTitle(false);
  }

  function handleMenuToggle(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    popupNativeMenu(getCtx(), { x: rect.left, y: rect.bottom }).catch((err) => {
      console.error("[menu] nativeMenuClient error:", err);
    });
  }

  return (
    <div className={styles.noteWindow} style={{ backgroundColor: hexToRgba(note.color, note.opacity), filter: focused ? "none" : "brightness(0.93)", "--glass": note.glass }}>
      <TitleBar note={note} editingTitle={editingTitle} setEditingTitle={setEditingTitle}
        commitTitle={commitTitle} onClose={handleClose} onMenuToggle={handleMenuToggle}
        onCollapseToggle={handleCollapseToggle} onShare={async () => {
          try {
            const pos = await appWindow.outerPosition();
            const size = await appWindow.outerSize();
            console.log("[share] opening at", pos.x + size.width + 8, pos.y);
            const result = await invoke("open_share_window", {
              x: pos.x + size.width + 8,
              y: pos.y,
            });
            console.log("[share] result:", result);
          } catch (e) {
            console.error("[share] error:", e);
          }
        }} />
      {activePanel && (
        <ColorPanel note={note} update={edit} onClose={() => setActivePanel(null)} />
      )}
      <NoteEditor note={note} update={edit} insertCheckboxRef={insertCheckboxRef}
        style={{ display: note.collapsed ? "none" : undefined }} />
      <div className={styles.resizeGrip}
        style={{ display: note.collapsed ? "none" : undefined }} />
    </div>
  );
}
