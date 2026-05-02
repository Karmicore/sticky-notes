import { describe, it, expect } from "vitest";
import { normalizeCode, matchKey } from "./keyboard";

describe("normalizeCode", () => {
  it("strips Key prefix and lowercases", () => {
    expect(normalizeCode("KeyN")).toBe("n");
    expect(normalizeCode("KeyA")).toBe("a");
    expect(normalizeCode("KeyZ")).toBe("z");
  });

  it("lowercases non-Key codes", () => {
    expect(normalizeCode("ArrowUp")).toBe("arrowup");
    expect(normalizeCode("ArrowDown")).toBe("arrowdown");
    expect(normalizeCode("Equal")).toBe("equal");
    expect(normalizeCode("Minus")).toBe("minus");
    expect(normalizeCode("Digit1")).toBe("digit1");
    expect(normalizeCode("F2")).toBe("f2");
    expect(normalizeCode("Delete")).toBe("delete");
    expect(normalizeCode("NumpadAdd")).toBe("numpadadd");
  });
});

function makeEvent(overrides) {
  return {
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    code: "",
    key: "",
    ...overrides,
  };
}

describe("matchKey", () => {
  it("matches Ctrl+N", () => {
    expect(matchKey(makeEvent({ ctrlKey: true, code: "KeyN" }))).toBe("note.new");
  });

  it("matches Ctrl+D", () => {
    expect(matchKey(makeEvent({ ctrlKey: true, code: "KeyD" }))).toBe("note.duplicate");
  });

  it("matches Ctrl+L", () => {
    expect(matchKey(makeEvent({ ctrlKey: true, code: "KeyL" }))).toBe("note.lock");
  });

  it("matches Ctrl+Digit1", () => {
    expect(matchKey(makeEvent({ ctrlKey: true, code: "Digit1" }))).toBe("note.checkbox");
  });

  it("matches F2", () => {
    expect(matchKey(makeEvent({ code: "F2" }))).toBe("note.rename");
  });

  it("matches Alt+T", () => {
    expect(matchKey(makeEvent({ altKey: true, code: "KeyT" }))).toBe("note.pin");
  });

  it("matches Alt+Delete", () => {
    expect(matchKey(makeEvent({ altKey: true, code: "Delete" }))).toBe("note.delete");
  });

  it("matches Alt+F4", () => {
    expect(matchKey(makeEvent({ altKey: true, code: "F4" }))).toBe("note.hide");
  });

  it("matches Ctrl+Shift+ArrowUp", () => {
    expect(matchKey(makeEvent({ ctrlKey: true, shiftKey: true, code: "ArrowUp" }))).toBe("opacity.up");
  });

  it("matches Ctrl+Shift+ArrowDown", () => {
    expect(matchKey(makeEvent({ ctrlKey: true, shiftKey: true, code: "ArrowDown" }))).toBe("opacity.down");
  });

  it("matches Ctrl+Equal for font.up", () => {
    expect(matchKey(makeEvent({ ctrlKey: true, code: "Equal" }))).toBe("font.up");
  });

  it("matches Ctrl+Minus for font.down", () => {
    expect(matchKey(makeEvent({ ctrlKey: true, code: "Minus" }))).toBe("font.down");
  });

  it("matches Ctrl+NumpadAdd for font.up", () => {
    expect(matchKey(makeEvent({ ctrlKey: true, code: "NumpadAdd" }))).toBe("font.up");
  });

  it("matches Ctrl+NumpadSubtract for font.down", () => {
    expect(matchKey(makeEvent({ ctrlKey: true, code: "NumpadSubtract" }))).toBe("font.down");
  });

  it("returns null for unmatched combo", () => {
    expect(matchKey(makeEvent({ code: "KeyX" }))).toBeNull();
  });

  it("returns null for Ctrl+Shift+N (not in keyMap)", () => {
    expect(matchKey(makeEvent({ ctrlKey: true, shiftKey: true, code: "KeyN" }))).toBeNull();
  });

  it("fallback: Ctrl+key='=' maps to font.up", () => {
    expect(matchKey(makeEvent({ ctrlKey: true, code: "NumpadAdd", key: "=" }))).toBe("font.up");
  });

  it("fallback: Ctrl+key='+' maps to font.up", () => {
    expect(matchKey(makeEvent({ ctrlKey: true, code: "NumpadAdd", key: "+" }))).toBe("font.up");
  });

  it("fallback: Ctrl+key='-' maps to font.down", () => {
    expect(matchKey(makeEvent({ ctrlKey: true, code: "NumpadSubtract", key: "-" }))).toBe("font.down");
  });

  it("Meta key acts as Ctrl", () => {
    expect(matchKey(makeEvent({ metaKey: true, code: "KeyN" }))).toBe("note.new");
  });

  it("Ctrl+Alt+N does NOT match Ctrl+N", () => {
    expect(matchKey(makeEvent({ ctrlKey: true, altKey: true, code: "KeyN" }))).toBeNull();
  });
});
