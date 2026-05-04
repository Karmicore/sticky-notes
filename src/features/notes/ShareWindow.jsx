import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { t } from "../../lib/i18n";
import { getRandomQuote } from "../../lib/quotes";
import ColorPicker from "./ColorPicker";
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

// Generate a darker gradient stop from a hex color via HSV
function hexToGradient(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  // Darker stop: reduce value by 35%
  const v2 = Math.max(0, v - 0.35);
  const c2 = v2 * s;
  const x2 = c2 * (1 - Math.abs(((h / 60) % 2) - 1));
  const m2 = v2 - c2;
  let r2, g2, b2;
  if (h < 60) { r2 = c2; g2 = x2; b2 = 0; }
  else if (h < 120) { r2 = x2; g2 = c2; b2 = 0; }
  else if (h < 180) { r2 = 0; g2 = c2; b2 = x2; }
  else if (h < 240) { r2 = 0; g2 = x2; b2 = c2; }
  else if (h < 300) { r2 = x2; g2 = 0; b2 = c2; }
  else { r2 = c2; g2 = 0; b2 = x2; }
  const toHex = (c) => Math.round((c + m2) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
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

  // Customization state
  const [showPicker, setShowPicker] = useState(false);
  const [customColor, setCustomColor] = useState(null);
  const [customQuote, setCustomQuote] = useState(null);
  const [editingQuote, setEditingQuote] = useState(false);
  const quoteInputRef = useRef(null);

  useEffect(() => {
    invoke("get_note", { id: noteId })
      .then(setNote)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [noteId]);

  const gradient = customColor
    ? [customColor, hexToGradient(customColor)]
    : getGradient(color);
  const displayQuote = customQuote ?? quote;
  const content = note?.content || "";
  const { items, done, total } = parseTodos(content);
  const hasTodos = total > 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const plainContent = content.replace(CHECKBOX_RE, "").replace(/\n{2,}/g, "\n").trim();

  const handleColorChange = useCallback((hex) => {
    setCustomColor(hex);
  }, []);

  const handleQuoteEdit = useCallback(() => {
    setEditingQuote(true);
    setTimeout(() => quoteInputRef.current?.focus(), 0);
  }, []);

  const handleQuoteCommit = useCallback((value) => {
    const trimmed = value.trim();
    setCustomQuote(trimmed || null);
    setEditingQuote(false);
  }, []);

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
        <div className={styles.headerActions}>
          <div className={styles.pickerWrap}>
            <button
              className={`${styles.iconBtn} ${showPicker ? styles.iconBtnActive : ""}`}
              onClick={() => setShowPicker(!showPicker)}
              title={t("share.pickColor")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="13.5" cy="6.5" r="2.5" />
                <circle cx="6" cy="12" r="2.5" />
                <circle cx="18" cy="12" r="2.5" />
                <circle cx="8" cy="18" r="2.5" />
                <circle cx="16" cy="18" r="2.5" />
              </svg>
            </button>
            {showPicker && (
              <div className={styles.pickerPanel}>
                <ColorPicker
                  color={customColor || color}
                  onChange={handleColorChange}
                />
                <div className={styles.pickerHint}>{t("share.pickColor")}</div>
              </div>
            )}
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>×</button>
        </div>
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

          {editingQuote ? (
            <input
              ref={quoteInputRef}
              className={styles.quoteInput}
              defaultValue={customQuote || ""}
              placeholder={quote}
              onBlur={(e) => handleQuoteCommit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuoteCommit(e.target.value);
                if (e.key === "Escape") setEditingQuote(false);
              }}
            />
          ) : (
            <div
              className={styles.encourageText}
              onClick={handleQuoteEdit}
              title={t("share.editQuote")}
            >
              {customQuote || displayQuote}
            </div>
          )}
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
