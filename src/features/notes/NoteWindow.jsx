import { useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useKeyboard } from "./useKeyboard";
import TitleBar from "./TitleBar";
import NoteEditor from "./NoteEditor";
import { popupNativeMenu } from "../../core/menu/nativeMenuClient";
import styles from "./NoteWindow.module.css";

const appWindow = getCurrentWindow();

export default function NoteWindow({ noteId, note, update, saveNow }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const noteRef = useRef(note);
  noteRef.current = note;

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
    update({ isAlwaysOnTop: val });
  }, [update]);

  const handleClose = useCallback(async () => {
    await saveNow();
    appWindow.close();
  }, [saveNow]);

  const changeFontSize = useCallback((delta) => {
    const cur = noteRef.current.fontSize;
    update({ fontSize: Math.min(72, Math.max(8, cur + delta)) });
  }, [update]);

  const changeOpacity = useCallback((delta) => {
    const cur = Math.round(noteRef.current.opacity * 100);
    const next = Math.min(100, Math.max(10, cur + delta));
    update({ opacity: next / 100 });
  }, [update]);

  // Context builder — always reads fresh state from refs
  const getCtx = useCallback(() => ({
    noteId,
    note: noteRef.current,
    update,
    changeFontSize,
    changeOpacity,
    setEditingTitle,
    onDelete: handleDelete,
    onHide: () => appWindow.hide(),
    onPin: handlePin,
  }), [noteId, update, changeFontSize, changeOpacity, handleDelete, handlePin]);

  useKeyboard(getCtx);

  function commitTitle(value) {
    const t = value.trim();
    if (t) { update({ title: t }); appWindow.setTitle(t); }
    setEditingTitle(false);
  }

  function handleMenuToggle(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    popupNativeMenu(getCtx(), { x: rect.left, y: rect.bottom }).catch(console.error);
  }

  return (
    <div className={styles.noteWindow} style={{ backgroundColor: note.color, opacity: note.opacity }}>
      <TitleBar note={note} editingTitle={editingTitle} setEditingTitle={setEditingTitle}
        commitTitle={commitTitle} onClose={handleClose} onMenuToggle={handleMenuToggle} />
      <NoteEditor note={note} update={update} />
      <div className={styles.resizeGrip} />
    </div>
  );
}
