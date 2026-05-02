import { useState, useEffect, useRef } from "react";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { COLORS, OPACITIES } from "../../constants";
import { commands, menuStructure } from "../../commands";
import styles from "./MenuWindow.module.css";

const appWindow = getCurrentWindow();

function parseHash() {
  const hash = window.location.hash.slice(1);
  const slashIdx = hash.indexOf("/");
  if (slashIdx === -1) return null;
  const prefix = hash.slice(0, slashIdx);
  if (prefix !== "menu") return null;
  const rest = hash.slice(slashIdx + 1);
  const slash2 = rest.indexOf("/");
  if (slash2 === -1) return null;
  const noteId = parseInt(rest.slice(0, slash2), 10);
  if (isNaN(noteId)) return null;
  try {
    const note = JSON.parse(decodeURIComponent(rest.slice(slash2 + 1)));
    return { noteId, note };
  } catch {
    return null;
  }
}

export default function MenuWindow() {
  const data = parseHash();
  const [sub, setSub] = useState(null);
  const ref = useRef(null);

  // Close when note window loses focus
  useEffect(() => {
    const unlisten = appWindow.onFocusChanged(({ payload: focused }) => {
      if (!focused) appWindow.close();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Close on click outside
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        appWindow.close();
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!data) return null;
  const { noteId, note } = data;

  function runCommand(id, arg) {
    emit("menu-action", { noteId, cmdId: id, arg });
    appWindow.close();
  }

  function renderItem(item) {
    if (item === "separator") return <div key="sep" className={styles.separator} />;

    const cmd = commands[item.id];
    if (!cmd) return null;

    const isToggle = cmd.toggle ? cmd.toggle({ note }) : undefined;

    if (item.submenu === "op") {
      return (
        <div key={item.id} className={`${styles.item} ${styles.hasSub}`}
          onMouseEnter={() => setSub("op")} onMouseLeave={() => setSub(null)}>
          <span className={styles.label}>{cmd.label}</span>
          <span className={styles.arrow}>▸</span>
          {sub === "op" && <div className={styles.submenu}>
            {OPACITIES.map((v) => (
              <div key={v}
                className={`${styles.subItem}${Math.round(note.opacity * 100) === v ? ` ${styles.subItemActive}` : ""}`}
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
                <div key={c}
                  className={`${styles.colorSwatch}${note.color === c ? ` ${styles.colorSwatchActive}` : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => runCommand(item.id, c)} />
              ))}
            </div>
          </div>}
        </div>
      );
    }

    return (
      <div key={item.id}
        className={`${styles.item}${cmd.danger ? ` ${styles.danger}` : ""}`}
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
