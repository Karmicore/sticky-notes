import { useRef, useCallback, useEffect } from "react";
import confetti from "canvas-confetti";
import styles from "./styles/NoteEditor.module.css";
import { CHECKBOX_RE, CHECKBOX_PREFIX, CB_LEN, CB_NEXT } from "./utils/checkbox";
import { t } from "../../lib/i18n";

export default function NoteEditor({ note, update, insertCheckboxRef, style }) {
  const taRef = useRef(null);

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
    const cur = line.substring(0, CB_LEN);
    const next = CB_NEXT[cur] || CHECKBOX_PREFIX;
    lines[idx] = next + line.substring(CB_LEN);
    if (next === "✅ ") {
      confetti({ particleCount: 8, spread: 15, startVelocity: 8, gravity: -0.2, ticks: 400, origin: { x: 0.5, y: 1 }, shapes: ["circle"], scalar: 0.4, colors: ["#fff","#f5f5f5","#e0e0e0"] });
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
    const lineEnd = val.indexOf("\n", cursorPos);
    const line = val.substring(lineStart, lineEnd === -1 ? val.length : lineEnd);
    if (!CHECKBOX_RE.test(line)) return;
    if (charInLine >= CB_LEN) return;
    const lineIdx = val.substring(0, cursorPos).split("\n").length - 1;
    toggleCb(lineIdx);
  }, [note.locked, toggleCb]);

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
      />
    </div>
  );
}
