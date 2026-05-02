import { useState, useEffect, useCallback } from "react";
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
