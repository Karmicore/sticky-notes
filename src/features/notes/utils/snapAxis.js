export const SNAP_THRESHOLD = 5;

export function snapAxis(val, size, targets) {
  let best = null;
  let bestDist = SNAP_THRESHOLD + 1;
  const edges = [val, val + size / 2, val + size];
  for (const t of targets) {
    const tEdges = [t.pos, t.pos + t.size / 2, t.pos + t.size];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const dist = Math.abs(edges[i] - tEdges[j]);
        if (dist < bestDist) {
          bestDist = dist;
          best = tEdges[j] - [0, size / 2, size][i];
        }
      }
    }
  }
  return best;
}
