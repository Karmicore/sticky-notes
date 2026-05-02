import { useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

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

  // Cancel all pending saves — call before delete to prevent re-insertion
  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    dirtyRef.current = false;
    noteRef.current = null;
  }, []);

  return { saveNow, edit, cancel };
}
