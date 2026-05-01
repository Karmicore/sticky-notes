import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { COLORS, OPACITIES } from "../../constants";
import { commands, menuStructure } from "../../commands";
import styles from "./NoteMenu.module.css";

export default function NoteMenu({ note, ctx, onClose, anchor }) {
  const [sub, setSub] = useState(null);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  // Auto-position: keep menu within viewport
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = anchor?.x ?? 0;
    let y = anchor?.y ?? 0;

    // If no anchor, default to top-right (near menu button)
    if (!anchor) {
      x = vw - rect.width - 8;
      y = 32;
    }

    // Clamp to viewport
    if (x + rect.width > vw) x = vw - rect.width - 4;
    if (y + rect.height > vh) y = vh - rect.height - 4;
    if (x < 4) x = 4;
    if (y < 4) y = 4;

    el.style.left = x + "px";
    el.style.top = y + "px";
  }, [anchor]);

  function runCommand(id, arg) {
    commands[id].run(ctx, arg);
    onClose();
  }

  function renderItem(item) {
    if (item === "separator") return <div key="sep" className={styles.ctxSeparator} />;

    const cmd = commands[item.id];
    const isToggle = cmd.toggle && cmd.toggle(ctx);

    if (item.submenu === "op") {
      return (
        <div key={item.id} className={`${styles.ctxItem} ${styles.ctxHasSub}`}
          onMouseEnter={() => setSub("op")} onMouseLeave={() => setSub(null)}>
          <span className={styles.ctxLabel}>{cmd.label}</span>
          <span className={styles.ctxArrow}>▸</span>
          {sub === "op" && <SubMenu position="right">
            {OPACITIES.map((v) => (
              <div key={v} className={`${styles.ctxSubItem}${Math.round(note.opacity * 100) === v ? ` ${styles.ctxSubItemActive}` : ""}`}
                onClick={() => runCommand(item.id, v)}>{v}%</div>
            ))}
          </SubMenu>}
        </div>
      );
    }

    if (item.submenu === "co") {
      return (
        <div key={item.id} className={`${styles.ctxItem} ${styles.ctxHasSub}`}
          onMouseEnter={() => setSub("co")} onMouseLeave={() => setSub(null)}>
          <span className={styles.ctxLabel}>{cmd.label}</span>
          <span className={styles.ctxArrow}>▸</span>
          {sub === "co" && <SubMenu position="right">
            <div className={styles.ctxColorGrid}>
              {COLORS.map((c) => (
                <div key={c} className={`${styles.ctxColorSwatch}${note.color === c ? ` ${styles.ctxColorSwatchActive}` : ""}`}
                  style={{ backgroundColor: c }} onClick={() => runCommand(item.id, c)} />
              ))}
            </div>
          </SubMenu>}
        </div>
      );
    }

    return (
      <div key={item.id} className={`${styles.ctxItem}${cmd.danger ? ` ${styles.ctxDanger}` : ""}`}
        onClick={() => runCommand(item.id)}>
        <span className={styles.ctxLabel}>{cmd.label}</span>
        {cmd.shortcut && <span className={styles.ctxShortcut}>{cmd.shortcut}</span>}
        {isToggle !== undefined && <span className={styles.ctxShortcut}>{isToggle ? "✓" : ""}</span>}
      </div>
    );
  }

  return (
    <div ref={ref} className={styles.contextMenu} onClick={(e) => e.stopPropagation()}>
      {menuStructure.map(renderItem)}
    </div>
  );
}

// Sub-menu with auto-flip when overflowing
function SubMenu({ position, children }) {
  const ref = useRef(null);
  const [flip, setFlip] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    if (rect.right > vw - 4) setFlip(true);
  }, []);

  return (
    <div ref={ref} className={styles.ctxSubmenu} style={flip ? { left: "auto", right: "100%" } : undefined}>
      {children}
    </div>
  );
}
