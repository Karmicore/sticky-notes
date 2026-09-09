import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { snapAxis } from "../utils/snapAxis";

const appWindow = getCurrentWindow();

// 两种拖动模式：
//  - "manual"：JS 手动 mousemove + setPosition（可吸附边缘），用于 Windows/macOS/Linux X11
//  - "native"：交给系统原生拖动（startDragging），用于 Linux + Wayland ——
//    该平台协议禁止客户端自行 setPosition，手动方案会完全无效
const dragModePromise = invoke("window_drag_mode").catch(() => "manual");

export function useDragSnap(ref, { noteId, onCollapseToggle }) {
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

      // 兜底：native 拖动结束时 mouseup 偶尔会丢失，下次按下前复位
      if (dragActive) dragActive = false;

      if (dragTimer) {
        clearTimeout(dragTimer);
        dragTimer = null;
        onCollapseToggle();
        return;
      }

      mouseDown = true;
      dragActive = false;
      startScreenX = e.screenX;
      startScreenY = e.screenY;

      dragTimer = setTimeout(() => {
        dragTimer = null;
        if (mouseDown && !dragActive) {
          startDrag(startScreenX, startScreenY);
        }
      }, 300);
    }

    function onMouseMove(e) {
      if (!mouseDown || dragActive || !dragTimer) return;
      if (Math.abs(e.screenX - startScreenX) > 10 || Math.abs(e.screenY - startScreenY) > 10) {
        clearTimeout(dragTimer);
        dragTimer = null;
        startDrag(startScreenX, startScreenY);
      }
    }

    function onMouseUp() {
      mouseDown = false;
    }

    async function startDrag(refScreenX, refScreenY) {
      dragActive = true;
      window.dispatchEvent(new CustomEvent("note-drag-start"));

      const mode = await dragModePromise;
      if (mode === "native") {
        // Wayland：系统接管拖动。期间无法读取窗口坐标、无法吸附，
        // 结束坐标也不可靠，故 note-drag-end 不带坐标，前端跳过落库。
        document.addEventListener("mouseup", endNativeDrag, { once: true });
        try {
          await appWindow.startDragging();
        } catch (err) {
          console.warn("startDragging failed:", err);
        }
        return;
      }

      // manual：手动 setPosition + 边缘吸附
      try {
        const [pos, size, rects] = await Promise.all([
          appWindow.outerPosition(),
          appWindow.innerSize(),
          invoke("get_all_notes_rect", { excludeId: noteId }),
        ]);
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
          // Save final position directly to avoid onMoved re-renders during drag
          appWindow.outerPosition().then((p) => {
            window.dispatchEvent(new CustomEvent("note-drag-end", {
              detail: { id: noteId, x: p.x, y: p.y },
            }));
          });
        }

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      } catch (err) {
        console.warn("drag init failed:", err);
        dragActive = false;
      }
    }

    function endNativeDrag() {
      dragActive = false;
      window.dispatchEvent(new CustomEvent("note-drag-end", {
        detail: { id: noteId },
      }));
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
  }, [ref, noteId, onCollapseToggle]);
}
