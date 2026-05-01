import { useState, useEffect, useRef } from "react";
import { COLORS, OPACITIES } from "../../constants";
import { commands, menuStructure } from "../../commands";
import styles from "./NoteMenu.module.css";

export default function NoteMenu({ note, ctx, onClose }) {
  const [sub, setSub] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

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
          {sub === "op" && <div className={styles.ctxSubmenu}>
            {OPACITIES.map((v) => (
              <div key={v} className={`${styles.ctxSubItem}${Math.round(note.opacity * 100) === v ? ` ${styles.ctxSubItemActive}` : ""}`}
                onClick={() => runCommand(item.id, v)}>{v}%</div>
            ))}
          </div>}
        </div>
      );
    }

    if (item.submenu === "co") {
      return (
        <div key={item.id} className={`${styles.ctxItem} ${styles.ctxHasSub}`}
          onMouseEnter={() => setSub("co")} onMouseLeave={() => setSub(null)}>
          <span className={styles.ctxLabel}>{cmd.label}</span>
          <span className={styles.ctxArrow}>▸</span>
          {sub === "co" && <div className={`${styles.ctxSubmenu} ${styles.ctxColorGrid}`}>
            {COLORS.map((c) => (
              <div key={c} className={`${styles.ctxColorSwatch}${note.color === c ? ` ${styles.ctxColorSwatchActive}` : ""}`}
                style={{ backgroundColor: c }} onClick={() => runCommand(item.id, c)} />
            ))}
          </div>}
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
