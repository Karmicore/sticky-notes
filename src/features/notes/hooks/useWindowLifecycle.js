import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export function useWindowLifecycle(noteId, saveNow, update) {
  // Skip onResized/onMoved during collapse/expand transitions
  // to prevent auto-save from overwriting expanded_width/expanded_height
  const transitioning = useRef(false);
  // Skip the trailing onMoved after drag ends (final setPosition callback)
  const skipNextMoved = useRef(false);

  // Sync window position to note state (for duplicate & save)
  useEffect(() => {
    if (noteId === null) return;
    const unlisten = appWindow.onMoved(({ payload: pos }) => {
      if (transitioning.current) return;
      if (skipNextMoved.current) { skipNextMoved.current = false; return; }
      update({ x: pos.x, y: pos.y });
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [noteId, update]);

  // Sync window size to note state (for duplicate & save)
  useEffect(() => {
    if (noteId === null) return;
    const unlisten = appWindow.onResized(({ payload: size }) => {
      if (transitioning.current) return;
      update({ width: size.width, height: size.height, expanded_width: size.width, expanded_height: size.height });
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

  // Skip onMoved re-renders during drag; save final position on drag end
  useEffect(() => {
    if (noteId === null) return;
    const onStart = () => { transitioning.current = true; };
    const onEnd = async ({ detail }) => {
      if (detail.id !== noteId) return;
      skipNextMoved.current = true;
      transitioning.current = false;
      try {
        const note = await invoke("get_note", { id: noteId });
        await invoke("save_note", { note: { ...note, x: detail.x, y: detail.y } });
      } catch (e) {
        console.error("Failed to save drag position:", e);
      }
    };
    window.addEventListener("note-drag-start", onStart);
    window.addEventListener("note-drag-end", onEnd);
    return () => {
      window.removeEventListener("note-drag-start", onStart);
      window.removeEventListener("note-drag-end", onEnd);
    };
  }, [noteId]);
}
