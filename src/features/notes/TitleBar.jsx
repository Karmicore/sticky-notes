import { useRef, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import styles from "./TitleBar.module.css";

const appWindow = getCurrentWindow();

export default function TitleBar({ note, editingTitle, setEditingTitle, commitTitle, onClose, onMenuToggle }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onMouseDown(e) {
      if (e.buttons !== 1) return;
      if (e.target.closest("button") || e.target.closest("input")) return;
      e.detail === 2
        ? appWindow.toggleMaximize().catch(() => {})
        : appWindow.startDragging();
    }

    el.addEventListener("mousedown", onMouseDown);
    return () => el.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <div className={styles.titleBar} ref={ref}>
      <button className={`${styles.titleBtn} ${styles.menuBtn}`} onClick={(e) => onMenuToggle(e)}>⋮</button>
      {editingTitle ? (
        <input className={styles.titleInput} type="text" defaultValue={note.title} autoFocus
          onBlur={(e) => commitTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle(e.target.value);
            if (e.key === "Escape") setEditingTitle(false);
          }} />
      ) : (
        <span className={styles.titleText} onDoubleClick={() => setEditingTitle(true)}>{note.title}</span>
      )}
      <div className={styles.titleActions}>
        <button className={`${styles.titleBtn} ${styles.closeBtn}`} onClick={onClose}>×</button>
      </div>
    </div>
  );
}
