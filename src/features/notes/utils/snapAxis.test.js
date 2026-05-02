import { describe, it, expect } from "vitest";
import { snapAxis, SNAP_THRESHOLD } from "./snapAxis";

describe("snapAxis", () => {
  it("snaps when edges are within threshold", () => {
    // val=98, size=100 → edges [98, 148, 198]
    // target pos=100, size=100 → edges [100, 150, 200]
    // left-to-left: |98-100| = 2 < 5 → snap
    const result = snapAxis(98, 100, [{ pos: 100, size: 100 }]);
    expect(result).toBe(100); // snapped to target's left edge
  });

  it("does not snap when beyond threshold", () => {
    const result = snapAxis(90, 100, [{ pos: 100, size: 100 }]);
    expect(result).toBeNull();
  });

  it("snaps center to target edge when within threshold", () => {
    // val=50, size=100 → edges [50, 100, 150]
    // target pos=100, size=100 → edges [100, 150, 200]
    // center(100) to left(100): dist=0 → snap!
    // best = 100 - 50 = 50
    const result = snapAxis(50, 100, [{ pos: 100, size: 100 }]);
    expect(result).toBe(50);
  });

  it("snaps right edge to target left edge", () => {
    // val=96, size=100 → edges [96, 146, 196]
    // target pos=200, size=100 → edges [200, 250, 300]
    // right-to-left: |196-200| = 4 < 5 → snap
    // best = 200 - 100 = 100
    const result = snapAxis(96, 100, [{ pos: 200, size: 100 }]);
    expect(result).toBe(100);
  });

  it("picks closest target among multiple", () => {
    const targets = [
      { pos: 100, size: 100 },
      { pos: 50, size: 100 },
    ];
    // val=98 → edges [98, 148, 198]
    // target1 edges [100, 150, 200]: left-left dist=2
    // target2 edges [50, 100, 150]: left-left dist=48
    // target1 wins
    const result = snapAxis(98, 100, targets);
    expect(result).toBe(100);
  });

  it("returns null for empty targets", () => {
    expect(snapAxis(100, 100, [])).toBeNull();
  });

  it("snaps at exact threshold boundary (5px)", () => {
    // SNAP_THRESHOLD = 5, bestDist starts at 6
    // dist=5 < 6 → should snap
    const result = snapAxis(95, 100, [{ pos: 100, size: 100 }]);
    expect(result).toBe(100);
  });

  it("does not snap at threshold+1", () => {
    // val=94, edges [94, 144, 194]
    // target edges [100, 150, 200]: left-left dist=6 > 5
    // But center: |144-150|=6, right: |194-200|=6
    // All distances are 6, bestDist starts at 6, so dist < bestDist is false
    const result = snapAxis(94, 100, [{ pos: 100, size: 100 }]);
    expect(result).toBeNull();
  });

  it("rejects right-to-right snap that would place window inside larger target", () => {
    // val=200, size=100 → edges [200, 250, 300]
    // target pos=100, size=200 → edges [100, 200, 300]
    // right edges match: |300-300|=0 → snap would be 200
    // But window [200,300] is strictly inside target [100,300] → rejected
    const result = snapAxis(200, 100, [{ pos: 100, size: 200 }]);
    expect(result).toBeNull();
  });

  it("allows same-size same-edge snap (legitimate alignment)", () => {
    // Same size windows, left-to-left alignment → allowed even though they overlap
    const result = snapAxis(98, 100, [{ pos: 100, size: 100 }]);
    expect(result).toBe(100);
  });

  it("snaps left edge to target right edge", () => {
    // val=196, size=100 → edges [196, 246, 296]
    // target pos=100, size=100 → edges [100, 150, 200]
    // left-to-right: |196-200|=4 < 5 → snap
    // best = 200 - 0 = 200
    const result = snapAxis(196, 100, [{ pos: 100, size: 100 }]);
    expect(result).toBe(200);
  });
});
