import { invoke } from "@tauri-apps/api/core";
import { t } from "../lib/i18n";

// Single source of truth for all commands.
// To add a command: add one entry here, then add its id to menuStructure in menu.js.

export const commands = {
  "note.checkbox": {
    label: () => t("menu.note.checkbox"),
    shortcut: "Ctrl+1",
    run: (ctx) => ctx.insertCheckbox?.(),
  },
  "note.new": {
    label: () => t("menu.note.new"),
    shortcut: "Ctrl+N",
    run: () => invoke("create_note_window"),
  },
  "note.duplicate": {
    label: () => t("menu.note.duplicate"),
    shortcut: "Ctrl+D",
    run: (ctx) => invoke("duplicate_note", { sourceId: ctx.noteId }),
  },
  "note.rename": {
    label: () => t("menu.note.rename"),
    shortcut: "F2",
    run: (ctx) => ctx.setEditingTitle(true),
  },
  "note.delete": {
    label: () => t("menu.note.delete"),
    shortcut: "Alt+Delete",
    run: (ctx) => ctx.onDelete(),
    danger: true,
  },
  "note.hide": {
    label: () => t("menu.note.hide"),
    shortcut: "Alt+F4",
    run: (ctx) => ctx.onHide(),
  },
  "window.show_all": {
    label: () => t("menu.window.show_all"),
    shortcut: "Alt+S",
    run: () => invoke("show_all_notes").catch(console.error),
  },
  "window.hide_all": {
    label: () => t("menu.window.hide_all"),
    shortcut: "Alt+H",
    run: () => invoke("hide_all_notes"),
  },
  "note.pin": {
    label: () => t("menu.note.pin"),
    shortcut: "Alt+T",
    run: (ctx) => ctx.onPin(),
    toggle: (ctx) => ctx.note.isAlwaysOnTop,
  },
  "note.lock": {
    label: () => t("menu.note.lock"),
    shortcut: "Ctrl+L",
    run: (ctx) => ctx.update({ locked: !ctx.note.locked }),
    toggle: (ctx) => ctx.note.locked,
  },
  "font.up": {
    label: () => t("menu.font.up"),
    shortcut: "Ctrl+=",
    run: (ctx) => ctx.changeFontSize(1),
  },
  "font.down": {
    label: () => t("menu.font.down"),
    shortcut: "Ctrl+-",
    run: (ctx) => ctx.changeFontSize(-1),
  },
  "opacity.up": {
    label: () => t("menu.opacity.up"),
    shortcut: "Ctrl+Shift+↑",
    run: (ctx) => ctx.changeOpacity(10),
  },
  "opacity.down": {
    label: () => t("menu.opacity.down"),
    shortcut: "Ctrl+Shift+↓",
    run: (ctx) => ctx.changeOpacity(-10),
  },
  "note.collapse.toggle": {
    label: () => t("menu.note.collapse.toggle"),
    shortcut: "",
    run: async (ctx) => {
      const updated = await invoke("toggle_note_collapsed", { noteId: ctx.noteId });
      ctx.update(updated);
    },
    toggle: (ctx) => ctx.note.collapsed,
  },
  "opacity.set": {
    label: () => t("menu.opacity"),
    shortcut: "",
    run: (ctx, value) => ctx.update({ opacity: value / 100 }),
    submenu: true,
  },
  "color.set": {
    label: () => t("menu.color"),
    shortcut: "",
    run: (ctx, color) => ctx.update({ color }),
    submenu: true,
  },
};
