import { useRef, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import styles from "./TitleBar.module.css";

const appWindow = getCurrentWindow();

export default function TitleBar({ note, editingTitle, setEditingTitle, commitTitle, onClose, onMenuToggle, onCollapseToggle }) {
  const ref = useRef(null);
  const clickTimer = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onMouseDown(e) {
      if (e.buttons !== 1) return;
      if (e.target.closest("button") || e.target.closest("input")) return;

      if (clickTimer.current) {
        // Second click within 250ms → collapse toggle
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
        onCollapseToggle();
      } else {
        // First click → wait to see if double-click follows
        clickTimer.current = setTimeout(() => {
          clickTimer.current = null;
          appWindow.startDragging();
        }, 250);
      }
    }

    el.addEventListener("mousedown", onMouseDown);
    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      clearTimeout(clickTimer.current);
    };
  }, [onCollapseToggle]);

  return (
    <div className={styles.titleBar} ref={ref}>
      {editingTitle ? (
        <input className={styles.titleInput} type="text" defaultValue={note.title} autoFocus
          onBlur={(e) => commitTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle(e.target.value);
            if (e.key === "Escape") setEditingTitle(false);
          }} />
      ) : (
        <span className={styles.titleText}>{note.title}</span>
      )}
      <div className={styles.titleActions}>
        <button className={`${styles.titleBtn} ${styles.menuBtn}`} onClick={(e) => onMenuToggle(e)}>⋮</button>
        <button className={`${styles.titleBtn} ${styles.closeBtn}`} onClick={onClose}>×</button>
      </div>
    </div>
  );
}
