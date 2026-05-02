import { useRef, useCallback, useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import styles from "./styles/NoteEditor.module.css";
import { CHECKBOX_RE, CHECKBOX_PREFIX, CB_LEN, CB_NEXT } from "./utils/checkbox";
import { blendWithWhite } from "../../lib/color";

const NBSP = " ";

export default function NoteEditor({ note, update, insertCheckboxRef, style }) {
  const taRef = useRef(null);
  const ovRef = useRef(null);
  const [taWidth, setTaWidth] = useState(0);

  const bgColor = useMemo(() => blendWithWhite(note.color, note.opacity), [note.color, note.opacity]);

  // Track textarea content width so overlay matches exactly (fixes cursor misalignment)
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    const sync = () => setTaWidth(ta.clientWidth);
    sync();
    const ro = new ResizeObserver(sync);
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
    if (ovRef.current && taRef.current) ovRef.current.scrollTop = taRef.current.scrollTop;
  }, []);

  const lines = note.content.split("\n");

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
      <div ref={ovRef} className={styles.overlay} style={{ fontSize: note.fontSize, width: taWidth }}>
        {lines.map((line, i) => {
          const m = line.match(CHECKBOX_RE);
          if (m) {
            const st = m[1];
            const cls = st === "x" ? styles.cbDone : st === "-" ? styles.cbProgress : "";
            const text = line.substring(CB_LEN);
            return (
              <div key={i} className={styles.cbLine}>
                <span className={styles.cbPrefix}>{line.substring(0, CB_LEN)}</span>
                <span>{text || NBSP}</span>
                <span className={styles.cbBox + (cls ? " " + cls : "")}
                  onClick={() => !note.locked && toggleCb(i)} />
              </div>
            );
          }
          return <div key={i} className={styles.line}>{line || NBSP}</div>;
        })}
      </div>
    </div>
  );
}
