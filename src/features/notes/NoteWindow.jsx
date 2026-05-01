import { useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useKeyboard } from "./useKeyboard";
import TitleBar from "./TitleBar";
import NoteEditor from "./NoteEditor";
import NoteMenu from "./NoteMenu";
import styles from "./NoteWindow.module.css";

const appWindow = getCurrentWindow();

export default function NoteWindow({ noteId, note, update, changeFontSize, changeOpacity }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const deleting = useRef(false);

  const handleDelete = useCallback(async () => {
    deleting.current = true;
    try {
      await invoke("delete_note", { id: note.id });
      await appWindow.close();
    } catch (e) {
      console.error(e);
      deleting.current = false;
    }
  }, [note.id]);

  const handlePin = useCallback(async () => {
    const val = !note.isAlwaysOnTop;
    await invoke("set_window_always_on_top", { onTop: val }).catch(console.error);
    update({ isAlwaysOnTop: val });
  }, [note.isAlwaysOnTop, update]);

  const handleClose = useCallback(async () => {
    try { await invoke("save_note", { note }); } catch (e) { console.error(e); }
    appWindow.close();
  }, [note]);

  function commitTitle(value) {
    const t = value.trim();
    if (t) { update({ title: t }); appWindow.setTitle(t); }
    setEditingTitle(false);
  }

  const getCtx = useCallback(() => ({
    noteId, note, update, changeFontSize, changeOpacity,
    setEditingTitle, onDelete: handleDelete,
    onHide: () => appWindow.hide(), onPin: handlePin,
  }), [noteId, note, update, changeFontSize, changeOpacity, handleDelete, handlePin]);

  useKeyboard(getCtx, [note]);

  function toggleMenu(e) {
    if (menuAnchor) {
      setMenuAnchor(null);
    } else {
      setMenuAnchor({ x: e.clientX, y: e.clientY });
    }
  }

  return (
    <div className={styles.noteWindow} style={{ backgroundColor: note.color, opacity: note.opacity }}>
      <TitleBar note={note} editingTitle={editingTitle} setEditingTitle={setEditingTitle}
        commitTitle={commitTitle} onClose={handleClose} onMenuToggle={toggleMenu} />
      <NoteEditor note={note} update={update} />
      <div className={styles.resizeGrip} />
      {menuAnchor && <NoteMenu note={note} ctx={getCtx()} onClose={() => setMenuAnchor(null)} anchor={menuAnchor} />}
    </div>
  );
}
