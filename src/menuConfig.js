// ── Menu Structure ──
// Declarative layout: command IDs, separators, submenus.
// MenuWindow renders from this; add/remove/reorder items here only.
// Command definitions live in commands.js.

export const menuStructure = [
  { id: "note.new" },
  { id: "window.show_all" },
  { id: "window.hide_all" },
  "separator",
  { id: "note.duplicate" },
  { id: "note.rename" },
  "separator",
  { id: "note.delete" },
  { id: "note.hide" },
  "separator",
  { id: "note.pin" },
  { id: "note.lock" },
  "separator",
  { id: "font.up" },
  { id: "font.down" },
  { id: "opacity.set", submenu: "op" },
  { id: "color.set", submenu: "co" },
];
