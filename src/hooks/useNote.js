import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useNote(noteId) {
  const [note, setNote] = useState(null);
  const noteRef = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => { noteRef.current = note; }, [note]);

  // Load
  useEffect(() => {
    if (noteId === null) return;
    invoke("get_note", { id: noteId })
      .then((n) => setNote({ ...n, locked: n.locked || false }))
      .catch(console.error);
  }, [noteId]);

  const update = useCallback((changes) => {
    setNote((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...changes };
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        invoke("save_note", { note: updated }).catch(() => {});
      }, 800);
      return updated;
    });
  }, []);

  const changeFontSize = useCallback((delta) => {
    const n = noteRef.current;
    if (!n) return;
    update({ fontSize: Math.min(72, Math.max(8, n.fontSize + delta)) });
  }, [update]);

  const changeOpacity = useCallback((delta) => {
    const n = noteRef.current;
    if (!n) return;
    const next = Math.min(100, Math.max(10, Math.round(n.opacity * 100) + delta));
    update({ opacity: next / 100 });
  }, [update]);

  const saveNow = useCallback(async () => {
    if (noteRef.current) {
      await invoke("save_note", { note: noteRef.current }).catch(() => {});
    }
  }, []);

  return { note, noteRef, update, changeFontSize, changeOpacity, saveNow };
}
