import { describe, it, expect } from "vitest";
import { CHECKBOX_RE, CHECKBOX_PREFIX, CB_LEN, CB_NEXT } from "./checkbox";

describe("CHECKBOX_RE", () => {
  it("matches unchecked checkbox", () => {
    const m = "- [ ] buy milk".match(CHECKBOX_RE);
    expect(m).not.toBeNull();
    expect(m[1]).toBe(" ");
  });

  it("matches in-progress checkbox", () => {
    const m = "- [-] working on it".match(CHECKBOX_RE);
    expect(m).not.toBeNull();
    expect(m[1]).toBe("-");
  });

  it("matches checked checkbox", () => {
    const m = "- [x] done".match(CHECKBOX_RE);
    expect(m).not.toBeNull();
    expect(m[1]).toBe("x");
  });

  it("does not match plain text", () => {
    expect("hello world".match(CHECKBOX_RE)).toBeNull();
  });

  it("does not match checkbox without space after bracket", () => {
    expect("- [x]done".match(CHECKBOX_RE)).toBeNull();
  });

  it("does not match checkbox at non-start of string", () => {
    expect("  - [ ] indented".match(CHECKBOX_RE)).toBeNull();
  });

  it("does not match empty checkbox bracket", () => {
    expect("- [] something".match(CHECKBOX_RE)).toBeNull();
  });

  it("does not match multi-char content in brackets", () => {
    expect("- [ab] text".match(CHECKBOX_RE)).toBeNull();
  });
});

describe("CB_NEXT state machine", () => {
  it("cycles: space → dash → x → space", () => {
    expect(CB_NEXT[" "]).toBe("-");
    expect(CB_NEXT["-"]).toBe("x");
    expect(CB_NEXT["x"]).toBe(" ");
  });

  it("defaults to space for unknown", () => {
    expect(CB_NEXT["?"] || " ").toBe(" ");
  });
});

describe("CHECKBOX_PREFIX and CB_LEN", () => {
  it("prefix is 6 chars: '- [ ] '", () => {
    expect(CHECKBOX_PREFIX).toBe("- [ ] ");
    expect(CB_LEN).toBe(6);
  });
});
