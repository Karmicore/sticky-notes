import { keyMap } from "../../../commands/keys";

export function normalizeCode(code) {
  return code.replace(/^Key/, "").toLowerCase();
}

export function matchKey(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push("ctrl");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  parts.push(normalizeCode(e.code));
  const combo = parts.join("+");

  if (keyMap[combo]) return keyMap[combo];

  // Fallback for keyboard layouts where e.code differs
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
    if (e.key === "=" || e.key === "+") return "font.up";
    if (e.key === "-") return "font.down";
  }

  return null;
}
