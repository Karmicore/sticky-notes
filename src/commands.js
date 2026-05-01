import { invoke } from "@tauri-apps/api/core";

// ── Command Registry ──
// Pure action definitions. Menu layout and keyboard bindings live in separate files.
// To add a command: add one entry here, then wire it in menuConfig.js and/or keyBindings.js.

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
    shortcut: "",
    run: (ctx) => ctx.onDelete(),
    danger: true,
  },
  "note.hide": {
    label: "隐藏便签",
    shortcut: "",
    run: (ctx) => ctx.onHide(),
  },
  "window.show_all": {
    label: "显示全部",
    shortcut: "Ctrl+Shift+S",
    run: () => invoke("show_all_notes"),
  },
  "window.hide_all": {
    label: "隐藏全部",
    shortcut: "Ctrl+Shift+H",
    run: () => invoke("hide_all_notes"),
  },
  "note.pin": {
    label: "始终置顶",
    shortcut: "",
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
    shortcut: "Ctrl++",
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
