import { useRef, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import styles from "./TitleBar.module.css";

const appWindow = getCurrentWindow();

export default function TitleBar({ note, editingTitle, setEditingTitle, commitTitle, onClose, onMenuToggle, onCollapseToggle }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let dragTimer = null;
    let mouseDown = false;
    let dragActive = false;
    let startScreenX = 0;
    let startScreenY = 0;
    let startWinX = 0;
    let startWinY = 0;

    function onMouseDown(e) {
      if (e.button !== 0) return;
      if (e.target.closest("button") || e.target.closest("input")) return;

      if (dragTimer) {
        // Second click within 300ms → collapse/expand
        clearTimeout(dragTimer);
        dragTimer = null;
        onCollapseToggle();
        return;
      }

      mouseDown = true;
      dragActive = false;
      startScreenX = e.screenX;
      startScreenY = e.screenY;

      // Double-click detection window: 300ms
      dragTimer = setTimeout(() => {
        dragTimer = null;
        if (mouseDown && !dragActive) {
          startNativeDrag(startScreenX, startScreenY);
        }
      }, 300);
    }

    function onMouseMove(e) {
      if (!mouseDown || dragActive || !dragTimer) return;
      if (Math.abs(e.screenX - startScreenX) > 10 || Math.abs(e.screenY - startScreenY) > 10) {
        clearTimeout(dragTimer);
        dragTimer = null;
        startNativeDrag(startScreenX, startScreenY);
      }
    }

    function onMouseUp() {
      mouseDown = false;
      // Don't clear dragTimer — the timer callback checks mouseDown
      // and won't start dragging if the button is already released.
      // This keeps the timer alive for double-click detection.
    }

    function startNativeDrag(refScreenX, refScreenY) {
      dragActive = true;
      appWindow.outerPosition().then((pos) => {
        startWinX = pos.x;
        startWinY = pos.y;

        function onMove(ev) {
          const dx = ev.screenX - refScreenX;
          const dy = ev.screenY - refScreenY;
          appWindow.setPosition(new LogicalPosition(startWinX + dx, startWinY + dy));
        }

        function onUp() {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          dragActive = false;
        }

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
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
        <button className={`${styles.titleBtn} ${styles.menuBtn}`} onClick={(e) => onMenuToggle(e)}>⋯</button>
        <button className={`${styles.titleBtn} ${styles.closeBtn}`} onClick={onClose}>×</button>
      </div>
    </div>
  );
}
