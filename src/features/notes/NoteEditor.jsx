import { useRef, useCallback, useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import styles from "./styles/NoteEditor.module.css";
import { CHECKBOX_RE, CHECKBOX_PREFIX, CB_LEN, CB_NEXT } from "./utils/checkbox";
import { blendWithWhite } from "../../lib/color";
import { measureVisualLines } from "./utils/measureLines";

export default function NoteEditor({ note, update, insertCheckboxRef, style }) {
  const taRef = useRef(null);
  const ovRef = useRef(null);
  const [taWidth, setTaWidth] = useState(0);

  const bgColor = useMemo(() => blendWithWhite(note.color, note.opacity), [note.color, note.opacity]);

  // Track textarea content width for line-wrap measurement
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    const ro = new ResizeObserver(([entry]) => setTaWidth(entry.contentRect.width));
    ro.observe(ta);
    return () => ro.disconnect();
  }, []);

  const setAndPreserve = useCallback((val) => {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    update({ content: val });
    requestAnimationFrame(() => { ta.selectionStart = s; ta.selectionEnd = e; });
  }, [update]);

  const insertCheckbox = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    const v = ta.value;
    const p = ta.selectionStart;
    const ls = v.lastIndexOf("\n", p - 1) + 1;
    const le = v.indexOf("\n", p);
    const line = v.substring(ls, le === -1 ? v.length : le);
    if (CHECKBOX_RE.test(line)) return;
    const nv = v.substring(0, ls) + CHECKBOX_PREFIX + v.substring(ls);
    update({ content: nv });
    requestAnimationFrame(() => { ta.selectionStart = p + CB_LEN; ta.selectionEnd = p + CB_LEN; });
  }, [update]);

  useEffect(() => {
    if (insertCheckboxRef) insertCheckboxRef.current = insertCheckbox;
  }, [insertCheckbox, insertCheckboxRef]);

  const handleKeyDown = useCallback((e) => {
    if (e.key !== "Enter") return;
    const ta = e.target;
    const v = ta.value;
    const p = ta.selectionStart;
    const ls = v.lastIndexOf("\n", p - 1) + 1;
    const line = v.substring(ls, p);
    const m = line.match(CHECKBOX_RE);
    if (!m) return;
    e.preventDefault();
    const rest = line.substring(CB_LEN);
    if (rest.length === 0) {
      update({ content: v.substring(0, ls) + v.substring(p) });
      requestAnimationFrame(() => { ta.selectionStart = ls; ta.selectionEnd = ls; });
    } else {
      const ins = "\n" + CHECKBOX_PREFIX;
      update({ content: v.substring(0, p) + ins + v.substring(p) });
      requestAnimationFrame(() => { ta.selectionStart = p + ins.length; ta.selectionEnd = p + ins.length; });
    }
  }, [update]);

  const toggleCb = useCallback((idx) => {
    const lines = note.content.split("\n");
    const line = lines[idx];
    if (!line) return;
    const cur = line[3];
    const next = CB_NEXT[cur] || " ";
    lines[idx] = line.substring(0, 3) + next + line.substring(4);
    if (next === "x") {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }
    setAndPreserve(lines.join("\n"));
  }, [note.content, setAndPreserve]);

  const handleScroll = useCallback(() => {
    if (ovRef.current && taRef.current) {
      ovRef.current.scrollTop = taRef.current.scrollTop;
    }
  }, []);

  const lines = note.content.split("\n");
  const lineHeights = useMemo(
    () => measureVisualLines(lines, note.fontSize, taWidth),
    [lines, note.fontSize, taWidth]
  );

  // Total content height for scroll sync (text height + top/bottom padding)
  const totalHeight = useMemo(() => {
    const textH = lineHeights.reduce((s, h) => s + h, 0);
    return textH + 12; // 6px padding top + 6px padding bottom
  }, [lineHeights]);

  // Compute cumulative Y offset for each logical line
  const cbPositions = useMemo(() => {
    const positions = [];
    let y = 0;
    for (let i = 0; i < lineHeights.length; i++) {
      if (CHECKBOX_RE.test(lines[i])) positions.push({ idx: i, y });
      y += lineHeights[i];
    }
    return positions;
  }, [lines, lineHeights]);

  return (
    <div className={styles.editor} style={style}>
      <textarea
        ref={taRef}
        className={styles.textarea}
        style={{ fontSize: note.fontSize, backgroundColor: bgColor }}
        value={note.content}
        placeholder="输入内容..."
        readOnly={note.locked}
        spellCheck={false}
        onChange={(e) => !note.locked && update({ content: e.target.value })}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
      />
      <div ref={ovRef} className={styles.overlay} style={{ fontSize: note.fontSize }}>
        <div className={styles.overlaySpacer} style={{ height: totalHeight }} />
        {cbPositions.map(({ idx, y }) => {
          const st = lines[idx].match(CHECKBOX_RE)[1];
          const cls = st === "x" ? styles.cbDone : st === "-" ? styles.cbProgress : "";
          return (
            <span key={idx}
              className={styles.cbBox + (cls ? " " + cls : "")}
              style={{ top: y + note.fontSize * 0.75 - 6.5, backgroundColor: bgColor }}
              onClick={() => !note.locked && toggleCb(idx)} />
          );
        })}
      </div>
    </div>
  );
}
