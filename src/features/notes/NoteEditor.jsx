import { useRef, useCallback, useEffect } from "react";
import styles from "./NoteEditor.module.css";

const CHECKBOX_RE = /^- \[([ x])\] /;
const CHECKBOX_PREFIX = "- [ ] ";

export default function NoteEditor({ note, update, insertCheckboxRef }) {
  const textareaRef = useRef(null);

  const insertCheckbox = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const val = ta.value;
    const pos = ta.selectionStart;
    const lineStart = val.lastIndexOf("\n", pos - 1) + 1;
    const lineEnd = val.indexOf("\n", pos);
    const line = val.substring(lineStart, lineEnd === -1 ? val.length : lineEnd);

    if (CHECKBOX_RE.test(line)) return;

    const newVal = val.substring(0, lineStart) + CHECKBOX_PREFIX + val.substring(lineStart);
    update({ content: newVal });
    requestAnimationFrame(() => {
      ta.selectionStart = pos + CHECKBOX_PREFIX.length;
      ta.selectionEnd = pos + CHECKBOX_PREFIX.length;
    });
  }, [update]);

  useEffect(() => {
    if (insertCheckboxRef) insertCheckboxRef.current = insertCheckbox;
  }, [insertCheckbox, insertCheckboxRef]);

  const handleKeyDown = useCallback((e) => {
    if (e.key !== "Enter") return;
    const ta = e.target;
    const val = ta.value;
    const pos = ta.selectionStart;
    const lineStart = val.lastIndexOf("\n", pos - 1) + 1;
    const line = val.substring(lineStart, pos);

    const match = line.match(CHECKBOX_RE);
    if (!match) return;

    e.preventDefault();
    const textAfterCb = line.substring(CHECKBOX_PREFIX.length);

    if (textAfterCb.length === 0) {
      // empty checkbox → remove prefix, go to next line
      const before = val.substring(0, lineStart);
      const after = val.substring(pos);
      update({ content: before + after });
      requestAnimationFrame(() => {
        ta.selectionStart = lineStart;
        ta.selectionEnd = lineStart;
      });
    } else {
      // has content → insert new checkbox line
      const insertion = "\n" + CHECKBOX_PREFIX;
      const newVal = val.substring(0, pos) + insertion + val.substring(pos);
      update({ content: newVal });
      requestAnimationFrame(() => {
        const newPos = pos + insertion.length;
        ta.selectionStart = newPos;
        ta.selectionEnd = newPos;
      });
    }
  }, [update]);

  return (
    <textarea
      ref={textareaRef}
      className={styles.textContent}
      value={note.content}
      placeholder="输入内容..."
      readOnly={note.locked}
      onChange={(e) => !note.locked && update({ content: e.target.value })}
      onKeyDown={handleKeyDown}
    />
  );
}
