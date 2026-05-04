import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { CHECKBOX_RE } from "./utils/checkbox";
import { t } from "../../lib/i18n";
import styles from "./styles/ShareWindow.module.css";

const CARD_W = 600;
const CARD_H = 314;

function parseCheckboxState(content) {
  const lines = content.split("\n");
  let done = 0;
  let total = 0;
  for (const line of lines) {
    const m = line.match(CHECKBOX_RE);
    if (m) {
      total++;
      if (m[1] === "✅") done++;
    }
  }
  return { done, total };
}

function truncate(str, max) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export default function ShareWindow() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const cardRef = useRef(null);
  const appWindow = getCurrentWindow();

  console.log("[ShareWindow] mounted, label:", appWindow.label);

  useEffect(() => {
    console.log("[ShareWindow] loading notes...");
    invoke("load_all_notes")
      .then((all) => {
        console.log("[ShareWindow] loaded", all.length, "notes");
        setNotes(all.filter((n) => n.visible));
      })
      .catch((e) => {
        console.error("[ShareWindow] Failed to load notes:", e);
        setError(String(e));
      })
      .finally(() => setLoading(false));
  }, []);

  const hasCheckboxes = notes.some((n) => parseCheckboxState(n.content).total > 0);
  const totalDone = notes.reduce((s, n) => s + parseCheckboxState(n.content).done, 0);
  const totalTasks = notes.reduce((s, n) => s + parseCheckboxState(n.content).total, 0);
  const progressPct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`;

  const generatePng = useCallback(async () => {
    if (!cardRef.current) return null;
    // Dynamic import to avoid crash if html-to-image fails to load
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(cardRef.current, {
      width: CARD_W * 2,
      height: CARD_H * 2,
      pixelRatio: 2,
    });
    const blob = await fetch(dataUrl).then((r) => r.blob());
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  }, []);

  const handleSave = useCallback(async () => {
    setStatus(t("export.loading"));
    try {
      const pngBytes = await generatePng();
      if (!pngBytes) return;

      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeBinaryFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({
        defaultPath: `sticky-notes-${dateStr}.png`,
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
  }, [dateStr, generatePng]);

  const handleCopy = useCallback(async () => {
    setStatus(t("export.loading"));
    try {
      const pngBytes = await generatePng();
      if (!pngBytes) return;

      await invoke("copy_image_to_clipboard", {
        data: Array.from(pngBytes),
      });
      setStatus(t("export.success"));
    } catch (e) {
      console.error(e);
      setStatus(t("share.copyFailed"));
    }
  }, [generatePng]);

  const handleClose = useCallback(() => {
    appWindow.close();
  }, [appWindow]);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.title}>{t("share.title")}</span>
          <button className={styles.closeBtn} onClick={handleClose}>{"×"}</button>
        </div>
        <div className={styles.preview}>
          <div style={{ color: "#f44336", fontSize: 13, textAlign: "center" }}>
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{t("share.title")}</span>
        <button className={styles.closeBtn} onClick={handleClose}>{"×"}</button>
      </div>

      <div className={styles.preview}>
        <div ref={cardRef} className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>{"Today's Progress"}</div>
            <div className={styles.cardDate}>{dateStr}</div>
          </div>

          <div className={styles.noteList}>
            {loading ? (
              <div style={{ color: "#666", fontSize: 13 }}>Loading...</div>
            ) : notes.length === 0 ? (
              <div style={{ color: "#666", fontSize: 13 }}>No notes</div>
            ) : (
              notes.slice(0, 6).map((note) => {
                const { done, total } = parseCheckboxState(note.content);
                const statusIcon =
                  total > 0 ? (done === total ? "✅" : "⏳") : "";
                return (
                  <div key={note.id} className={styles.noteItem}>
                    <div
                      className={styles.colorDot}
                      style={{ background: note.color }}
                    />
                    {total > 0 && (
                      <span className={styles.noteStatus}>{statusIcon}</span>
                    )}
                    <span className={styles.noteTitle}>
                      {truncate(note.title, 20)}
                    </span>
                    {note.content && (
                      <span className={styles.noteContent}>
                        {truncate(
                          note.content.replace(CHECKBOX_RE, "").trim(),
                          40
                        )}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {hasCheckboxes && (
            <div className={styles.stats}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className={styles.statsText}>
                <span>{totalDone}/{totalTasks} done</span>
                <span>{progressPct}%</span>
              </div>
            </div>
          )}

          <div className={styles.footer}>Sticky Notes</div>
        </div>
      </div>

      {status && <div className={styles.status}>{status}</div>}

      <div className={styles.actions}>
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={handleCopy}
        >
          {t("share.copy")}
        </button>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={handleSave}
        >
          {t("share.save")}
        </button>
      </div>
    </div>
  );
}
