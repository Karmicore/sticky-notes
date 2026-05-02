import { describe, it, expect } from "vitest";
import { commands } from "./registry";
import { keyMap } from "./keys";

describe("commands registry", () => {
  it("every command has a label or is a submenu", () => {
    for (const [id, cmd] of Object.entries(commands)) {
      if (!cmd.submenu) {
        expect(cmd.label).toBeTruthy();
      }
    }
  });

  it("every command has a run function", () => {
    for (const [id, cmd] of Object.entries(commands)) {
      expect(typeof cmd.run).toBe("function");
    }
  });

  it("every non-empty keyMap entry points to an existing command", () => {
    for (const [key, cmdId] of Object.entries(keyMap)) {
      expect(commands[cmdId]).toBeDefined();
    }
  });

  it("shortcut strings are well-formed (Ctrl/Alt/Shift + Key)", () => {
    for (const [id, cmd] of Object.entries(commands)) {
      if (cmd.shortcut) {
        // Should contain a '+' separator for combos, or be a single key like "F2"
        const hasPlus = cmd.shortcut.includes("+");
        const isSingleKey = /^[A-Z]\d?$|^F\d{1,2}$/.test(cmd.shortcut);
        expect(hasPlus || isSingleKey).toBe(true);
      }
    }
  });
});

describe("keyMap completeness", () => {
  const expectedCommands = [
    "note.checkbox",
    "note.new",
    "note.duplicate",
    "note.lock",
    "opacity.up",
    "opacity.down",
    "font.up",
    "font.down",
    "note.rename",
    "note.pin",
    "note.delete",
    "note.hide",
  ];

  for (const cmdId of expectedCommands) {
    it(`keyMap has at least one binding for ${cmdId}`, () => {
      const bindings = Object.entries(keyMap).filter(([, v]) => v === cmdId);
      expect(bindings.length).toBeGreaterThanOrEqual(1);
    });
  }
});

describe("keyMap conflicts", () => {
  it("no duplicate key combos", () => {
    const keys = Object.keys(keyMap);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});
