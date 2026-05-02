import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export function useWindowLifecycle(noteId, saveNow, update) {
  // Skip onResized/onMoved during collapse/expand transitions
  // to prevent auto-save from overwriting expanded_width/expanded_height
  const transitioning = useRef(false);

  // Sync window position to note state (for duplicate & save)
  useEffect(() => {
    if (noteId === null) return;
    const unlisten = appWindow.onMoved(({ payload: pos }) => {
      if (transitioning.current) return;
      update({ x: pos.x, y: pos.y });
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [noteId, update]);

  // Sync window size to note state (for duplicate & save)
  useEffect(() => {
    if (noteId === null) return;
    const unlisten = appWindow.onResized(({ payload: size }) => {
      if (transitioning.current) return;
      update({ width: size.width, height: size.height });
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [noteId, update]);

  // Sync collapsed state from backend (tray collapse/expand all / toggle)
  // Payload is [targetNoteId, collapsed]. Filter by noteId to ignore
  // events intended for other note windows.
  useEffect(() => {
    if (noteId === null) return;
    const unlisten = listen("note-collapsed-changed", ({ payload: [targetId, collapsed] }) => {
      if (targetId !== noteId) return;
      transitioning.current = true;
      update({ collapsed });
      setTimeout(() => { transitioning.current = false; }, 200);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [noteId, update]);

  // Save on tray quit
  useEffect(() => {
    if (noteId === null) return;
    const unlisten = listen("quit-app", async () => {
      await saveNow();
      await appWindow.close();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [noteId, saveNow]);

  // Tray "新建便签" event
  useEffect(() => {
    const unlisten = listen("create-note", () => {
      invoke("create_note_window").catch(console.error);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);
}
