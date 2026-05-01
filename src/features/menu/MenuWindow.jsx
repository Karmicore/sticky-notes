import { useState, useEffect, useRef } from "react";
import { emit, getCurrentWindow } from "@tauri-apps/api/window";
import { COLORS, OPACITIES } from "../../constants";
import { commands, menuStructure } from "../../commands";
import styles from "./MenuWindow.module.css";

const appWindow = getCurrentWindow();

export default function MenuWindow({ noteId, note }) {
  const [sub, setSub] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function onBlur() { appWindow.close(); }
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  function runCommand(id, arg) {
    emit("menu-action", { noteId, cmdId: id, arg });
    appWindow.close();
  }

  function renderItem(item) {
    if (item === "separator") return <div key="sep" className={styles.separator} />;

    const cmd = commands[item.id];

    if (item.submenu === "op") {
      return (
        <div key={item.id} className={`${styles.item} ${styles.hasSub}`}
          onMouseEnter={() => setSub("op")} onMouseLeave={() => setSub(null)}>
          <span className={styles.label}>{cmd.label}</span>
          <span className={styles.arrow}>▸</span>
          {sub === "op" && <div className={styles.submenu}>
            {OPACITIES.map((v) => (
              <div key={v} className={`${styles.subItem}${Math.round(note.opacity * 100) === v ? ` ${styles.subItemActive}` : ""}`}
                onClick={() => runCommand(item.id, v)}>{v}%</div>
            ))}
          </div>}
        </div>
      );
    }

    if (item.submenu === "co") {
      return (
        <div key={item.id} className={`${styles.item} ${styles.hasSub}`}
          onMouseEnter={() => setSub("co")} onMouseLeave={() => setSub(null)}>
          <span className={styles.label}>{cmd.label}</span>
          <span className={styles.arrow}>▸</span>
          {sub === "co" && <div className={styles.submenu}>
            <div className={styles.colorGrid}>
              {COLORS.map((c) => (
                <div key={c} className={`${styles.colorSwatch}${note.color === c ? ` ${styles.colorSwatchActive}` : ""}`}
                  style={{ backgroundColor: c }} onClick={() => runCommand(item.id, c)} />
              ))}
            </div>
          </div>}
        </div>
      );
    }

    const isToggle = cmd.toggle ? cmd.toggle({ note }) : undefined;

    return (
      <div key={item.id} className={`${styles.item}${cmd.danger ? ` ${styles.danger}` : ""}`}
        onClick={() => runCommand(item.id)}>
        <span className={styles.label}>{cmd.label}</span>
        {cmd.shortcut && <span className={styles.shortcut}>{cmd.shortcut}</span>}
        {isToggle !== undefined && <span className={styles.shortcut}>{isToggle ? "✓" : ""}</span>}
      </div>
    );
  }

  return (
    <div ref={ref} className={styles.menu}>
      {menuStructure.map(renderItem)}
    </div>
  );
}
