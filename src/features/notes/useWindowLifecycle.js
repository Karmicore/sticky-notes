import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useWindowLifecycle(noteId, saveNow) {
  const appWindow = getCurrentWindow();

  // Save on tray quit
  useEffect(() => {
    if (noteId === null) return;
    const unlisten = listen("quit-app", async () => {
      await saveNow();
      await appWindow.close();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [noteId, saveNow, appWindow]);
}
