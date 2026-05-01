import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useNote(noteId) {
  const [note, setNote] = useState(null);
  const saveTimer = useRef(null);
  const noteRef = useRef(null);

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
    setNote((prev) => {
      if (!prev) return prev;
      return { ...prev, fontSize: Math.min(72, Math.max(8, prev.fontSize + delta)) };
    });
  }, []);

  const changeOpacity = useCallback((delta) => {
    setNote((prev) => {
      if (!prev) return prev;
      const next = Math.min(100, Math.max(10, Math.round(prev.opacity * 100) + delta));
      return { ...prev, opacity: next / 100 };
    });
  }, []);

  const saveNow = useCallback(async () => {
    if (noteRef.current) {
      await invoke("save_note", { note: noteRef.current }).catch(() => {});
    }
  }, []);

  return { note, update, changeFontSize, changeOpacity, saveNow };
}
