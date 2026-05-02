import { useRef, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import styles from "./TitleBar.module.css";

const appWindow = getCurrentWindow();

export default function TitleBar({ note, editingTitle, setEditingTitle, commitTitle, onClose, onMenuToggle, onCollapseToggle }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let dragTimer = null;
    let dragStarted = false;
    let mouseDownX = 0;
    let mouseDownY = 0;

    function onMouseDown(e) {
      if (e.button !== 0) return;
      if (e.target.closest("button") || e.target.closest("input")) return;

      if (dragTimer) {
        // Second click within window → collapse
        clearTimeout(dragTimer);
        dragTimer = null;
        onCollapseToggle();
        return;
      }

      dragStarted = false;
      mouseDownX = e.screenX;
      mouseDownY = e.screenY;

      // Start drag after timeout (if no move detected first)
      dragTimer = setTimeout(() => {
        dragTimer = null;
        if (!dragStarted) {
          dragStarted = true;
          appWindow.startDragging();
        }
      }, 300);
    }

    function onMouseMove(e) {
      if (!dragTimer || dragStarted) return;
      // Moved >3px → user wants to drag, start immediately
      if (Math.abs(e.screenX - mouseDownX) > 3 || Math.abs(e.screenY - mouseDownY) > 3) {
        clearTimeout(dragTimer);
        dragTimer = null;
        dragStarted = true;
        appWindow.startDragging();
      }
    }

    function onMouseUp() {
      if (dragTimer) {
        clearTimeout(dragTimer);
        dragTimer = null;
      }
    }

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      clearTimeout(dragTimer);
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
