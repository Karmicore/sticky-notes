import { useEffect, useRef } from "react";
import { commands, keyMap } from "../../commands";

function matchKey(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push("ctrl");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  parts.push(e.code.toLowerCase());
  const combo = parts.join("+");

  if (keyMap[combo]) return keyMap[combo];

  // Fallback for keyboard layouts where e.code differs
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
    if (e.key === "=" || e.key === "+") return "font.up";
    if (e.key === "-") return "font.down";
  }

  return null;
}

export function useKeyboard(getCtx) {
  const ref = useRef(getCtx);
  ref.current = getCtx;

  useEffect(() => {
    function onKey(e) {
      const cmdId = matchKey(e);
      if (!cmdId) return;
      const cmd = commands[cmdId];
      if (!cmd) return;
      e.preventDefault();
      cmd.run(ref.current());
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
