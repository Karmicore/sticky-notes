import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export function useNote(noteId) {
  const [note, setNote] = useState(null);

  useEffect(() => {
    if (noteId === null) return;
    invoke("get_note", { id: noteId })
      .then((n) => {
        setNote({ ...n, locked: n.locked || false });
        appWindow.show();
      })
      .catch(console.error);
  }, [noteId]);

  // Listen for content cleared by cut export
  useEffect(() => {
    if (noteId === null) return;
    const unlisten = listen("note-content-cleared", ({ payload: clearedId }) => {
      if (clearedId === noteId) {
        invoke("get_note", { id: noteId })
          .then((n) => setNote({ ...n, locked: n.locked || false }))
          .catch(console.error);
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [noteId]);

  // Raw state update (no auto-save trigger)
  const update = useCallback((changes) => {
    setNote((prev) => (prev ? { ...prev, ...changes } : prev));
  }, []);

  return { note, update, setNote };
}
