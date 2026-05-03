import { describe, it, expect } from "vitest";
import { CHECKBOX_RE, CHECKBOX_PREFIX, CB_LEN, CB_NEXT } from "./checkbox";

describe("CHECKBOX_RE", () => {
  it("matches unchecked checkbox", () => {
    const m = "☐ buy milk".match(CHECKBOX_RE);
    expect(m).not.toBeNull();
    expect(m[1]).toBe("☐");
  });

  it("matches in-progress checkbox", () => {
    const m = "☒ working on it".match(CHECKBOX_RE);
    expect(m).not.toBeNull();
    expect(m[1]).toBe("☒");
  });

  it("matches checked checkbox", () => {
    const m = "☑ done".match(CHECKBOX_RE);
    expect(m).not.toBeNull();
    expect(m[1]).toBe("☑");
  });

  it("does not match plain text", () => {
    expect("hello world".match(CHECKBOX_RE)).toBeNull();
  });

  it("does not match checkbox without space after", () => {
    expect("☑done".match(CHECKBOX_RE)).toBeNull();
  });

  it("does not match checkbox at non-start of string", () => {
    expect("  ☐ indented".match(CHECKBOX_RE)).toBeNull();
  });
});

describe("CB_NEXT state machine", () => {
  it("cycles: ☐ → ☒ → ☑ → ☐", () => {
    expect(CB_NEXT["☐"]).toBe("☒");
    expect(CB_NEXT["☒"]).toBe("☑");
    expect(CB_NEXT["☑"]).toBe("☐");
  });

  it("defaults to ☐ for unknown", () => {
    expect(CB_NEXT["?"] || "☐").toBe("☐");
  });
});

describe("CHECKBOX_PREFIX and CB_LEN", () => {
  it("prefix is '☐ ' (2 chars)", () => {
    expect(CHECKBOX_PREFIX).toBe("☐ ");
    expect(CB_LEN).toBe(2);
  });
});
