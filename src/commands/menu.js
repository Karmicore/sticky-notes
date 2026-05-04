// Declarative menu layout: command IDs, separators, submenus.
// add/remove/reorder items here only.

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
  { id: "note.collapse.toggle" },
  "separator",
  { id: "note.checkbox" },
  { id: "note.share" },
  { id: "font.up" },
  { id: "font.down" },
  { id: "appearance", submenu: "appearance" },
];
