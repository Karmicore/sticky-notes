import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { t } from "../../lib/i18n";
import { getRandomQuote } from "../../lib/quotes";
import styles from "./styles/ShareWindow.module.css";

const GRADIENTS = {
  "#FFEB3B": ["#F57F17", "#FF6F00"],
  "#2196F3": ["#0D47A1", "#1565C0"],
  "#4CAF50": ["#1B5E20", "#2E7D32"],
  "#E91E63": ["#880E4F", "#AD1457"],
  "#9C27B0": ["#4A148C", "#6A1B9A"],
  "#FF9800": ["#E65100", "#EF6C00"],
  "#FFFFFF": ["#37474F", "#455A64"],
  "#03A9F4": ["#01579B", "#0277BD"],
  "#8BC34A": ["#33691E", "#558B2F"],
  "#F44336": ["#B71C1C", "#C62828"],
  "#FFC0CB": ["#880E4F", "#AD1457"],
  "#9E9E9E": ["#263238", "#37474F"],
};

const CHECKBOX_RE = /^(⬜|⏳|✅) /;

function getGradient(color) {
  const c = color?.toUpperCase();
  return GRADIENTS[c] || ["#1a1a2e", "#16213e"];
}

function parseHash() {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  return {
    noteId: parseInt(params.get("noteId"), 10),
    color: params.get("color") || "#FFEB3B",
  };
}

function parseTodos(content) {
  if (!content) return { items: [], done: 0, total: 0 };
  const lines = content.split("\n");
  const items = [];
  let done = 0;
  for (const line of lines) {
    const m = line.match(CHECKBOX_RE);
    if (m) {
      const status = m[1];
      const text = line.slice(m[0].length).trim();
      if (text) {
        items.push({ text, done: status === "✅" });
        if (status === "✅") done++;
      }
    }
  }
  return { items, done, total: items.length };
}

function truncate(str, max) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export default function ShareWindow() {
  const { noteId, color } = useMemo(parseHash, []);
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const cardRef = useRef(null);
  const appWindow = getCurrentWindow();
  const quote = useMemo(getRandomQuote, []);

  useEffect(() => {
    invoke("get_note", { id: noteId })
      .then(setNote)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [noteId]);

  const gradient = getGradient(color);
  const content = note?.content || "";
  const { items, done, total } = parseTodos(content);
  const hasTodos = total > 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const plainContent = content.replace(CHECKBOX_RE, "").replace(/\n{2,}/g, "\n").trim();

  const generatePng = useCallback(async () => {
    if (!cardRef.current) return null;
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(cardRef.current, {
      width: 520 * 2,
      height: 580 * 2,
      pixelRatio: 2,
    });
    const blob = await fetch(dataUrl).then((r) => r.blob());
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  }, []);

  const handleCopy = useCallback(async () => {
    setStatus(t("export.loading"));
    try {
      const pngBytes = await generatePng();
      if (!pngBytes) return;
      await invoke("copy_image_to_clipboard", { data: Array.from(pngBytes) });
      setStatus(t("export.success"));
    } catch (e) {
      console.error(e);
      setStatus(t("share.copyFailed"));
    }
  }, [generatePng]);

  const handleSave = useCallback(async () => {
    setStatus(t("export.loading"));
    try {
      const pngBytes = await generatePng();
      if (!pngBytes) return;
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeBinaryFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({
        defaultPath: `share-${Date.now()}.png`,
        filters: [{ name: "PNG", extensions: ["png"] }],
      });
      if (path) {
        await writeBinaryFile(path, pngBytes);
        setStatus(t("share.saved"));
      } else {
        setStatus(null);
      }
    } catch (e) {
      console.error(e);
      setStatus(t("share.saveFailed"));
    }
  }, [generatePng]);

  const handleClose = useCallback(() => {
    appWindow.close();
  }, [appWindow]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.title}>{t("share.title")}</span>
          <button className={styles.closeBtn} onClick={handleClose}>×</button>
        </div>
        <div className={styles.empty}>{t("export.loading")}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{t("share.title")}</span>
        <button className={styles.closeBtn} onClick={handleClose}>×</button>
      </div>

      <div className={styles.preview}>
        <div
          ref={cardRef}
          className={styles.card}
          style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
        >
          {hasTodos ? (
            <>
              <div className={styles.progressHeader}>
                <span className={styles.progressCount}>
                  <span className={styles.checkIcon}>✓</span> {done} / {total}
                </span>
                <span className={styles.progressPct}>{pct}%</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${pct}%` }} />
              </div>
              <div className={styles.todoList}>
                {items.slice(0, 8).map((item, i) => (
                  <div key={i} className={styles.todoItem}>
                    <span className={item.done ? styles.todoDone : styles.todoPending}>
                      {item.done ? "☑" : "☐"}
                    </span>
                    <span className={item.done ? styles.todoTextDone : styles.todoText}>
                      {truncate(item.text, 30)}
                    </span>
                  </div>
                ))}
                {items.length > 8 && (
                  <div className={styles.todoMore}>+{items.length - 8} more</div>
                )}
              </div>
            </>
          ) : plainContent ? (
            <div className={styles.textContent}>
              "{truncate(plainContent, 120)}"
            </div>
          ) : null}

          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerDot} />
            <span className={styles.dividerLine} />
          </div>

          <div className={styles.encourageText}>{quote}</div>
          <div className={styles.branding}>Sticky Notes</div>
        </div>
      </div>

      {status && <div className={styles.status}>{status}</div>}

      <div className={styles.actions}>
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleCopy}>
          {t("share.copy")}
        </button>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave}>
          {t("share.save")}
        </button>
      </div>
    </div>
  );
}
