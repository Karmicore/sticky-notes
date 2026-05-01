import { useEffect } from "react";
import { commands } from "../../commands";

// ── Key Map ──
// Maps keydown event signatures to command IDs.
// Built once at module load from the command registry shortcuts.

const keyMap = {
  "ctrl+n":                "note.new",
  "ctrl+d":                "note.duplicate",
  "ctrl+l":                "note.lock",
  "ctrl+shift+arrowup":    "opacity.up",
  "ctrl+shift+arrowdown":  "opacity.down",
  "ctrl+equal":            "font.up",
  "ctrl+numpadadd":        "font.up",
  "ctrl+minus":            "font.down",
  "ctrl+numpadsubtract":   "font.down",
  "f2":                    "note.rename",
};

function matchKey(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push("ctrl");
  if (e.shiftKey) parts.push("shift");
  parts.push(e.code.toLowerCase());
  const combo = parts.join("+");

  if (keyMap[combo]) return keyMap[combo];

  // Fallback for keyboard layouts where code differs
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
    if (e.key === "=" || e.key === "+") return "font.up";
    if (e.key === "-") return "font.down";
  }

  return null;
}

// getCtx: () => fresh context snapshot — avoids stale closure
export function useKeyboard(getCtx, deps) {
  useEffect(() => {
    const ctx = getCtx();
    if (!ctx.note) return;

    function onKey(e) {
      const cmdId = matchKey(e);
      if (!cmdId) return;
      const cmd = commands[cmdId];
      if (!cmd) return;
      e.preventDefault();
      cmd.run(getCtx());
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, deps);
}
