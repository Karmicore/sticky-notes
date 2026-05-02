/**
 * Measure how many visual lines each logical line occupies in a word-wrapping context.
 * Uses canvas to approximate the browser's text layout.
 *
 * @param {string[]} lines - logical lines (split by \n)
 * @param {number} fontSize - current font size in px
 * @param {number} contentWidth - textarea inner content width in px
 * @param {string} [fontFamily] - CSS font-family string
 * @returns {{ charWidths: number[][], lineHeights: number[] }}
 *   charWidths[i] = pixel width of each character in logical line i
 *   lineHeights[i] = total visual height in px for logical line i
 */
export function measureVisualLines(lines, fontSize, contentWidth, fontFamily = '"Segoe UI", "Microsoft YaHei", sans-serif') {
  if (!contentWidth || contentWidth <= 0) {
    const lh = fontSize * 1.5;
    return { charWidths: lines.map(() => []), lineHeights: lines.map(() => lh) };
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = `${fontSize}px ${fontFamily}`;

  const charWidths = [];
  const lineHeights = [];
  const lineHeight = fontSize * 1.5;

  for (const line of lines) {
    if (line.length === 0) {
      charWidths.push([]);
      lineHeights.push(lineHeight);
      continue;
    }

    const widths = new Array(line.length);
    let acc = 0;
    let visualLines = 1;

    for (let i = 0; i < line.length; i++) {
      const w = ctx.measureText(line[i]).width;
      widths[i] = w;
      acc += w;
      if (acc > contentWidth) {
        visualLines++;
        acc = w;
      }
    }

    charWidths.push(widths);
    lineHeights.push(visualLines * lineHeight);
  }

  return { charWidths, lineHeights };
}
