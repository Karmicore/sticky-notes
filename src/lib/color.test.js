import { describe, it, expect } from "vitest";
import { hexToRgb, hexToRgba, blendWithWhite } from "./color";

describe("hexToRgb", () => {
  it("parses #FF0000", () => {
    expect(hexToRgb("#FF0000")).toEqual([255, 0, 0]);
  });

  it("parses without # prefix", () => {
    expect(hexToRgb("00FF00")).toEqual([0, 255, 0]);
  });

  it("parses #0000FF", () => {
    expect(hexToRgb("#0000FF")).toEqual([0, 0, 255]);
  });

  it("parses #000000", () => {
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
  });

  it("parses #FFFFFF", () => {
    expect(hexToRgb("#FFFFFF")).toEqual([255, 255, 255]);
  });
});

describe("hexToRgba", () => {
  it("returns rgba string", () => {
    expect(hexToRgba("#FF0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
  });

  it("works with full opacity", () => {
    expect(hexToRgba("#00FF00", 1)).toBe("rgba(0, 255, 0, 1)");
  });

  it("works with zero opacity", () => {
    expect(hexToRgba("#0000FF", 0)).toBe("rgba(0, 0, 255, 0)");
  });
});

describe("blendWithWhite", () => {
  it("full opacity returns original color", () => {
    expect(blendWithWhite("#FF0000", 1)).toBe("rgb(255, 0, 0)");
  });

  it("zero opacity returns white", () => {
    expect(blendWithWhite("#FF0000", 0)).toBe("rgb(255, 255, 255)");
  });

  it("half opacity blends with white", () => {
    // #FF0000 at 0.5: r=255*0.5+255*0.5=255, g=0*0.5+255*0.5=128, b=0*0.5+255*0.5=128
    expect(blendWithWhite("#FF0000", 0.5)).toBe("rgb(255, 128, 128)");
  });

  it("works with non-red colors", () => {
    // #0000FF at 0.5: r=128, g=128, b=255
    expect(blendWithWhite("#0000FF", 0.5)).toBe("rgb(128, 128, 255)");
  });
});
