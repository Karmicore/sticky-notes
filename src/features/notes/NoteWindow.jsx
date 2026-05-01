import { useState, useRef, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useKeyboard } from "./useKeyboard";
import TitleBar from "./TitleBar";
import NoteEditor from "./NoteEditor";
import { commands } from "../../commands";
import styles from "./NoteWindow.module.css";

const appWindow = getCurrentWindow();

export default function NoteWindow({ noteId, note, update, changeFontSize, changeOpacity }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const deleting = useRef(false);
  const getCtxRef = useRef(null);

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

  getCtxRef.current = getCtx;

  useKeyboard(getCtx, [note]);

  useEffect(() => {
    const unlisten = listen("menu-action", (event) => {
      const { cmdId, arg } = event.payload;
      const cmd = commands[cmdId];
      if (cmd) cmd.run(getCtxRef.current(), arg);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  function handleMenuToggle(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.screenX;
    const screenY = e.screenY + rect.height;
    invoke("open_context_menu", {
      x: screenX,
      y: screenY,
      noteId,
      note,
    }).catch(console.error);
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
