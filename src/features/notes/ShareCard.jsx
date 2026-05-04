import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toPng } from "html-to-image";
import { CHECKBOX_RE } from "./utils/checkbox";
import { t } from "../../lib/i18n";
import styles from "./styles/ShareCard.module.css";

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

export default function ShareCard({ noteId, onClose }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    invoke("load_all_notes")
      .then((all) => setNotes(all.filter((n) => n.visible)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const hasCheckboxes = notes.some((n) => parseCheckboxState(n.content).total > 0);
  const totalDone = notes.reduce((s, n) => s + parseCheckboxState(n.content).done, 0);
  const totalTasks = notes.reduce((s, n) => s + parseCheckboxState(n.content).total, 0);
  const progressPct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`;

  const handleSave = useCallback(async () => {
    if (!cardRef.current) return;
    setStatus(t("export.loading"));
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: CARD_W * 2,
        height: CARD_H * 2,
        pixelRatio: 2,
      });
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const buffer = await blob.arrayBuffer();

      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeBinaryFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({
        defaultPath: `sticky-notes-${dateStr}.png`,
        filters: [{ name: "PNG", extensions: ["png"] }],
      });
      if (path) {
        await writeBinaryFile(path, new Uint8Array(buffer));
        setStatus("已保存");
      } else {
        setStatus(null);
      }
    } catch (e) {
      console.error(e);
      setStatus("保存失败");
    }
  }, [dateStr]);

  const handleCopy = useCallback(async () => {
    if (!cardRef.current) return;
    setStatus(t("export.loading"));
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: CARD_W * 2,
        height: CARD_H * 2,
        pixelRatio: 2,
      });
      const blob = await fetch(dataUrl).then((r) => r.blob());

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setStatus(t("export.success"));
    } catch (e) {
      console.error(e);
      setStatus("复制失败");
    }
  }, []);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.preview}>
          <div ref={cardRef} className={styles.card}>
            <div className={styles.header}>
              <div className={styles.title}>Today&apos;s Progress</div>
              <div className={styles.date}>{dateStr}</div>
            </div>

            <div className={styles.noteList}>
              {loading ? (
                <div style={{ color: "#666", fontSize: 13 }}>Loading...</div>
              ) : (
                notes.slice(0, 6).map((note) => {
                  const { done, total } = parseCheckboxState(note.content);
                  const status =
                    total > 0
                      ? done === total
                        ? "✅"
                        : "⏳"
                      : "";
                  return (
                    <div key={note.id} className={styles.noteItem}>
                      <div
                        className={styles.colorDot}
                        style={{ background: note.color }}
                      />
                      {total > 0 && (
                        <span className={styles.noteStatus}>{status}</span>
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
                  <span>
                    {totalDone}/{totalTasks} done
                  </span>
                  <span>{progressPct}%</span>
                </div>
              </div>
            )}

            <div className={styles.footer}>Sticky Notes</div>
          </div>
        </div>

        {status && <div className={styles.status}>{status}</div>}

        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleCopy}>
            复制到剪贴板
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave}>
            保存图片
          </button>
        </div>
      </div>
    </div>
  );
}
