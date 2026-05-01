import { useEffect, useRef } from "react";
import { commands } from "../../commands";

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
  "ctrl+shift+keyh":       "window.hide_all",
  "ctrl+shift+keys":       "window.show_all",
};

function matchKey(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push("ctrl");
  if (e.shiftKey) parts.push("shift");
  parts.push(e.code.toLowerCase());
  const combo = parts.join("+");

  if (keyMap[combo]) return keyMap[combo];

  if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
    if (e.key === "=" || e.key === "+") return "font.up";
    if (e.key === "-") return "font.down";
  }

  return null;
}

export function useKeyboard(getCtx, deps) {
  const getCtxRef = useRef(getCtx);
  getCtxRef.current = getCtx;

  useEffect(() => {
    function onKey(e) {
      const cmdId = matchKey(e);
      if (!cmdId) return;
      const cmd = commands[cmdId];
      if (!cmd) return;
      e.preventDefault();
      cmd.run(getCtxRef.current());
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, deps);
}
