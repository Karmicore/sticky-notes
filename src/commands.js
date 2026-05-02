import { invoke } from "@tauri-apps/api/core";

// ── Command Registry ──
// Single source of truth for all commands, keyboard shortcuts, and menu structure.
// To add a command: add one entry here, then add its id to menuStructure below.

export const commands = {
  "note.new": {
    label: "新建便签",
    shortcut: "Ctrl+N",
    run: () => invoke("create_note_window"),
  },
  "note.duplicate": {
    label: "复制便签",
    shortcut: "Ctrl+D",
    run: (ctx) => invoke("duplicate_note", { sourceId: ctx.noteId }),
  },
  "note.rename": {
    label: "重命名",
    shortcut: "F2",
    run: (ctx) => ctx.setEditingTitle(true),
  },
  "note.delete": {
    label: "删除便签",
    shortcut: "Alt+Delete",
    run: (ctx) => ctx.onDelete(),
    danger: true,
  },
  "note.hide": {
    label: "隐藏便签",
    shortcut: "Alt+F4",
    run: (ctx) => ctx.onHide(),
  },
  "window.show_all": {
    label: "显示全部",
    shortcut: "Alt+S",
    run: () => invoke("show_all_notes"),
  },
  "window.hide_all": {
    label: "隐藏全部",
    shortcut: "Alt+H",
    run: () => invoke("hide_all_notes"),
  },
  "note.pin": {
    label: "始终置顶",
    shortcut: "Alt+T",
    run: (ctx) => ctx.onPin(),
    toggle: (ctx) => ctx.note.isAlwaysOnTop,
  },
  "note.lock": {
    label: "锁定便签",
    shortcut: "Ctrl+L",
    run: (ctx) => ctx.update({ locked: !ctx.note.locked }),
    toggle: (ctx) => ctx.note.locked,
  },
  "font.up": {
    label: "字体增大",
    shortcut: "Ctrl+=",
    run: (ctx) => ctx.changeFontSize(1),
  },
  "font.down": {
    label: "字体减小",
    shortcut: "Ctrl+-",
    run: (ctx) => ctx.changeFontSize(-1),
  },
  "opacity.up": {
    label: "",
    shortcut: "Ctrl+Shift+↑",
    run: (ctx) => ctx.changeOpacity(10),
  },
  "opacity.down": {
    label: "",
    shortcut: "Ctrl+Shift+↓",
    run: (ctx) => ctx.changeOpacity(-10),
  },
  "opacity.set": {
    label: "透明度",
    shortcut: "",
    run: (ctx, value) => ctx.update({ opacity: value / 100 }),
    submenu: true,
  },
  "color.set": {
    label: "颜色",
    shortcut: "",
    run: (ctx, color) => ctx.update({ color }),
    submenu: true,
  },
};

// ── Menu Structure ──
// Declarative layout: command IDs, separators, submenus.
// MenuWindow renders from this; add/remove/reorder items here only.

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

// ── Keyboard Map ──
// Key combos use KeyboardEvent.code format (lowercase).

export const keyMap = {
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
  "alt+s":                 "window.show_all",
  "alt+h":                 "window.hide_all",
  "alt+t":                 "note.pin",
  "alt+delete":            "note.delete",
  "alt+f4":                "note.hide",
};
