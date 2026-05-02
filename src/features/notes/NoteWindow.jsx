import { useState, useRef, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useKeyboard } from "./hooks/useKeyboard";
import TitleBar from "./TitleBar";
import NoteEditor from "./NoteEditor";
import { popupNativeMenu } from "../../lib/nativeMenu";
import styles from "./styles/NoteWindow.module.css";

function hexToRgba(hex, alpha) {
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const appWindow = getCurrentWindow();

export default function NoteWindow({ noteId, note, update, edit, saveNow }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [focused, setFocused] = useState(true);
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
      await invoke("delete_note", { id: noteRef.current.id });
      await appWindow.close();
    } catch (e) {
      console.error(e);
    }
  }, []);

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
      update(updated); // server response — already saved in Rust, no auto-save
    } catch (e) {
      console.error(e);
    }
  }, [update]);

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
    <div className={styles.noteWindow} style={{ backgroundColor: hexToRgba(note.color, note.opacity), filter: focused ? "none" : "brightness(0.93)" }}>
      <TitleBar note={note} editingTitle={editingTitle} setEditingTitle={setEditingTitle}
        commitTitle={commitTitle} onClose={handleClose} onMenuToggle={handleMenuToggle}
        onCollapseToggle={handleCollapseToggle} />
      <NoteEditor note={note} update={edit} insertCheckboxRef={insertCheckboxRef}
        style={{ display: note.collapsed ? "none" : undefined }} />
      <div className={styles.resizeGrip}
        style={{ display: note.collapsed ? "none" : undefined }} />
    </div>
  );
}
