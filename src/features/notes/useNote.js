import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useNote(noteId) {
  const [note, setNote] = useState(null);

  useEffect(() => {
    if (noteId === null) return;
    invoke("get_note", { id: noteId })
      .then((n) => setNote({ ...n, locked: n.locked || false }))
      .catch(console.error);
  }, [noteId]);

  const update = useCallback((changes) => {
    setNote((prev) => (prev ? { ...prev, ...changes } : prev));
  }, []);

  return { note, update, setNote };
}

export function useAutoSave(note, delay = 800) {
  const timer = useRef(null);
  const noteRef = useRef(null);

  useEffect(() => { noteRef.current = note; }, [note]);

  useEffect(() => {
    if (!note) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      invoke("save_note", { note }).catch(() => {});
    }, delay);
    return () => clearTimeout(timer.current);
  }, [note, delay]);

  const saveNow = useCallback(async () => {
    if (noteRef.current) {
      await invoke("save_note", { note: noteRef.current }).catch(() => {});
    }
  }, []);

  return { saveNow };
}
