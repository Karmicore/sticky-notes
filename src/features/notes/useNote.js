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

  // Raw state update (no auto-save trigger)
  const update = useCallback((changes) => {
    setNote((prev) => (prev ? { ...prev, ...changes } : prev));
  }, []);

  return { note, update, setNote };
}

export function useAutoSave(note, update, delay = 800) {
  const timer = useRef(null);
  const noteRef = useRef(null);
  const dirtyRef = useRef(false);

  useEffect(() => { noteRef.current = note; }, [note]);

  const markDirty = useCallback(() => { dirtyRef.current = true; }, []);

  useEffect(() => {
    if (!note || !dirtyRef.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      dirtyRef.current = false;
      invoke("save_note", { note: noteRef.current }).catch(() => {});
    }, delay);
    return () => clearTimeout(timer.current);
  }, [note, delay]);

  const saveNow = useCallback(async () => {
    if (noteRef.current) {
      clearTimeout(timer.current);
      dirtyRef.current = false;
      await invoke("save_note", { note: noteRef.current }).catch(() => {});
    }
  }, []);

  // User edit — marks dirty + updates state (triggers auto-save)
  const edit = useCallback((changes) => {
    markDirty();
    update(changes);
  }, [update, markDirty]);

  return { saveNow, edit };
}
