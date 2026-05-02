/**
 * Measure how many visual lines each logical line occupies using the browser's
 * own text layout engine (hidden div + character spans).
 *
 * @param {string[]} lines - logical lines (split by \n)
 * @param {number} fontSize - current font size in px
 * @param {number} contentWidth - textarea inner content width in px (clientWidth - padding)
 * @returns {number[]} lineHeights[i] = total visual height in px for logical line i
 */
export function measureVisualLines(lines, fontSize, contentWidth) {
  const lineHeight = fontSize * 1.5;

  if (!contentWidth || contentWidth <= 0) {
    return lines.map(() => lineHeight);
  }

  const el = document.createElement("div");
  el.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;" +
    "word-break:break-all;white-space:pre-wrap;overflow-wrap:break-word;" +
    `font-size:${fontSize}px;font-family:"Segoe UI","Microsoft YaHei",sans-serif;` +
    `line-height:1.5;padding:0;margin:0;border:0;` +
    `width:${contentWidth}px;`;

  document.body.appendChild(el);

  const lineHeights = lines.map((line) => {
    if (line.length === 0) return lineHeight;

    el.textContent = "";
    const frag = document.createDocumentFragment();
    for (let i = 0; i < line.length; i++) {
      const span = document.createElement("span");
      span.textContent = line[i];
      frag.appendChild(span);
    }
    el.appendChild(frag);

    const spans = el.children;
    let visualLines = 1;
    let prevTop = spans[0].offsetTop;

    for (let i = 1; i < spans.length; i++) {
      const top = spans[i].offsetTop;
      if (top > prevTop) {
        visualLines++;
        prevTop = top;
      }
    }

    return visualLines * lineHeight;
  });

  document.body.removeChild(el);
  return lineHeights;
}
