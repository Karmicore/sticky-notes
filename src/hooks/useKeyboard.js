import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useKeyboard({ note, noteRef, update, changeFontSize, changeOpacity }) {
  useEffect(() => {
    if (!note) return;

    function onKey(e) {
      const c = e.ctrlKey || e.metaKey;
      if (c && e.code === "KeyN") { e.preventDefault(); invoke("create_note_window"); }
      else if (c && e.code === "KeyD") { e.preventDefault(); invoke("duplicate_note", { sourceId: note.id }); }
      else if (c && e.code === "KeyL") { e.preventDefault(); update({ locked: !noteRef.current.locked }); }
      else if (c && e.shiftKey && e.code === "ArrowUp") { e.preventDefault(); changeOpacity(10); }
      else if (c && e.shiftKey && e.code === "ArrowDown") { e.preventDefault(); changeOpacity(-10); }
      else if (c && (e.code === "Equal" || e.code === "NumpadAdd")) { e.preventDefault(); changeFontSize(1); }
      else if (c && (e.code === "Minus" || e.code === "NumpadSubtract")) { e.preventDefault(); changeFontSize(-1); }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [note, noteRef, update, changeFontSize, changeOpacity]);
}
