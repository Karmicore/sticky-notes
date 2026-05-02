/**
 * Parse a hex color string to [r, g, b] array.
 */
export function hexToRgb(hex) {
  const n = parseInt(hex.startsWith("#") ? hex.slice(1) : hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Return an rgba() string from a hex color and alpha.
 */
export function hexToRgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Blend a hex color with white at the given opacity (0–1),
 * returning an opaque rgb() string that visually matches
 * the translucent color on a white background.
 */
export function blendWithWhite(hex, opacity) {
  const [r, g, b] = hexToRgb(hex);
  const a = opacity;
  return `rgb(${Math.round(r * a + 255 * (1 - a))}, ${Math.round(g * a + 255 * (1 - a))}, ${Math.round(b * a + 255 * (1 - a))})`;
}
