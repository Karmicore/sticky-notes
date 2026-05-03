import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import styles from "./styles/ExportPopup.module.css";

export default function ExportPopup() {
  const [notes, setNotes] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCutConfirm, setShowCutConfirm] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const allNotes = await invoke("load_all_notes");
        setNotes(allNotes);

        const savedIds = await invoke("get_export_selected_ids");
        if (savedIds && savedIds.length > 0) {
          const validIds = savedIds.filter((id) =>
            allNotes.some((n) => n.id === id)
          );
          setSelectedIds(validIds);
        } else {
          setSelectedIds(allNotes.map((n) => n.id));
        }
      } catch (e) {
        console.error("Failed to load notes:", e);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const saveSelection = useCallback(async (ids) => {
    try {
      await invoke("set_export_selected_ids", { ids });
    } catch (e) {
      console.error("Failed to save selection:", e);
    }
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.length === notes.length ? [] : notes.map((n) => n.id)
    );
  }, [notes]);

  useEffect(() => {
    if (selectedIds.length > 0 || notes.length > 0) {
      saveSelection(selectedIds);
    }
  }, [selectedIds, saveSelection, notes.length]);

  const doCopyExport = useCallback(async () => {
    try {
      await invoke("export_notes_copy", { ids: selectedIds });
      setMessage("已复制到剪贴板");
      setTimeout(() => setMessage(""), 2000);
    } catch (e) {
      console.error("Export failed:", e);
      setMessage("导出失败");
      setTimeout(() => setMessage(""), 2000);
    }
  }, [selectedIds]);

  const doCutExport = useCallback(async () => {
    try {
      await invoke("export_notes_cut", { ids: selectedIds });
      setMessage("已剪切到剪贴板");
      setShowCutConfirm(false);
      setTimeout(() => setMessage(""), 2000);
      const allNotes = await invoke("load_all_notes");
      setNotes(allNotes);
    } catch (e) {
      console.error("Cut export failed:", e);
      setMessage("导出失败");
      setTimeout(() => setMessage(""), 2000);
    }
  }, [selectedIds]);

  const closeWindow = useCallback(() => {
    getCurrentWindow().close();
  }, []);

  if (loading) {
    return <div className={styles.panel}>Loading...</div>;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>导出便签</h3>
        <button className={styles.toggleAllBtn} onClick={toggleAll}>
          {selectedIds.length === notes.length ? "取消全选" : "全选"}
        </button>
      </div>

      <div className={styles.noteList}>
        {notes.map((note) => (
          <label key={note.id} className={styles.noteItem}>
            <input
              type="checkbox"
              checked={selectedIds.includes(note.id)}
              onChange={() => toggleSelect(note.id)}
            />
            <span className={styles.noteTitle}>{note.title}</span>
            {note.content && (
              <span className={styles.notePreview}>{note.content}</span>
            )}
          </label>
        ))}
      </div>

      <div className={styles.actions}>
        <button
          className={styles.copyBtn}
          onClick={doCopyExport}
          disabled={selectedIds.length === 0}
        >
          复制导出
        </button>
        <button
          className={styles.cutBtn}
          onClick={() => setShowCutConfirm(true)}
          disabled={selectedIds.length === 0}
        >
          剪切导出
        </button>
      </div>

      {message && <div className={styles.message}>{message}</div>}

      {showCutConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog}>
            <p>剪切导出会清空所选便签的内容，确定继续？</p>
            <div className={styles.confirmActions}>
              <button className={styles.confirmOk} onClick={doCutExport}>
                确定
              </button>
              <button
                className={styles.confirmCancel}
                onClick={() => setShowCutConfirm(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
