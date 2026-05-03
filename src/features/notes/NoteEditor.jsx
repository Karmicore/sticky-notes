import { useRef, useCallback, useEffect } from "react";
import confetti from "canvas-confetti";
import styles from "./styles/NoteEditor.module.css";
import { CHECKBOX_RE, CHECKBOX_PREFIX, CB_LEN, CB_NEXT } from "./utils/checkbox";
import { t } from "../../lib/i18n";

export default function NoteEditor({ note, update, insertCheckboxRef, style }) {
  const taRef = useRef(null);
  const ovRef = useRef(null);

  // Sync overlay scroll with textarea
  const handleScroll = useCallback(() => {
    if (ovRef.current && taRef.current) ovRef.current.scrollTop = taRef.current.scrollTop;
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
    const cur = line[0];
    const next = CB_NEXT[cur] || "☐";
    lines[idx] = next + line.substring(1);
    if (next === "☑") {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }
    setAndPreserve(lines.join("\n"));
  }, [note.content, setAndPreserve]);

  const handleTextareaClick = useCallback(() => {
    const ta = taRef.current;
    if (!ta || note.locked) return;
    const cursorPos = ta.selectionStart;
    const val = ta.value;
    const lineStart = val.lastIndexOf("\n", cursorPos - 1) + 1;
    const charInLine = cursorPos - lineStart;
    // Only toggle if click landed on the checkbox character itself (first char)
    if (charInLine > 1) return;
    const lineEnd = val.indexOf("\n", cursorPos);
    const line = val.substring(lineStart, lineEnd === -1 ? val.length : lineEnd);
    if (!CHECKBOX_RE.test(line)) return;
    const lineIdx = val.substring(0, cursorPos).split("\n").length - 1;
    toggleCb(lineIdx);
  }, [note.locked, toggleCb]);

  const lines = note.content.split("\n");

  return (
    <div className={styles.editor} style={style}>
      <textarea
        ref={taRef}
        className={styles.textarea}
        style={{ fontSize: note.fontSize }}
        value={note.content}
        placeholder={t("editor.placeholder")}
        readOnly={note.locked}
        spellCheck={false}
        onChange={(e) => !note.locked && update({ content: e.target.value })}
        onKeyDown={handleKeyDown}
        onClick={handleTextareaClick}
        onScroll={handleScroll}
      />
      <div ref={ovRef} className={styles.cbOverlay} style={{ fontSize: note.fontSize }}>
        {lines.map((line, i) => {
          const m = line.match(CHECKBOX_RE);
          if (!m) return <div key={i} className={styles.cbLine}>&nbsp;</div>;
          const sym = m[1];
          const cls = sym === "☑" ? styles.cbDone : sym === "☒" ? styles.cbProgress : styles.cbEmpty;
          return (
            <div key={i} className={styles.cbLine}>
              <span className={cls}>{sym}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
