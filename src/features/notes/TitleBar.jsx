import { useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import styles from "./TitleBar.module.css";

const appWindow = getCurrentWindow();
const SNAP_THRESHOLD = 5;

function snapAxis(val, size, targets) {
  let best = null;
  let bestDist = SNAP_THRESHOLD + 1;
  const edges = [val, val + size / 2, val + size];
  for (const t of targets) {
    const tEdges = [t.pos, t.pos + t.size / 2, t.pos + t.size];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const dist = Math.abs(edges[i] - tEdges[j]);
        if (dist < bestDist) {
          bestDist = dist;
          best = tEdges[j] - [0, size / 2, size][i];
        }
      }
    }
  }
  return best;
}

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
    }

    function startNativeDrag(refScreenX, refScreenY) {
      dragActive = true;
      Promise.all([
        appWindow.outerPosition(),
        appWindow.innerSize(),
        invoke("get_all_notes_rect", { excludeId: note.id }),
      ]).then(([pos, size, rects]) => {
        startWinX = pos.x;
        startWinY = pos.y;
        const xTargets = rects.map((r) => ({ pos: r.x, size: r.width }));
        const yTargets = rects.map((r) => ({ pos: r.y, size: r.height }));

        function onMove(ev) {
          const dx = ev.screenX - refScreenX;
          const dy = ev.screenY - refScreenY;
          let newX = startWinX + dx;
          let newY = startWinY + dy;
          const sx = snapAxis(newX, size.width, xTargets);
          const sy = snapAxis(newY, size.height, yTargets);
          if (sx !== null) newX = sx;
          if (sy !== null) newY = sy;
          appWindow.setPosition(new LogicalPosition(newX, newY));
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
  }, [onCollapseToggle, note.id]);

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
