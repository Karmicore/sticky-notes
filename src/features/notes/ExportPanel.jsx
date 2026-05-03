import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { t } from "../../lib/i18n";
import styles from "./styles/ExportPanel.module.css";

export default function ExportPanel() {
  const [notes, setNotes] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCutConfirm, setShowCutConfirm] = useState(false);
  const [message, setMessage] = useState("");

  // 加载便签列表和记忆的选择
  useEffect(() => {
    async function loadData() {
      try {
        // 获取所有便签
        const allNotes = await invoke("load_all_notes");
        setNotes(allNotes);

        // 获取记忆的选择
        const savedIds = await invoke("get_export_selected_ids");
        if (savedIds && savedIds.length > 0) {
          // 过滤掉已删除的便签
          const validIds = savedIds.filter((id) =>
            allNotes.some((n) => n.id === id)
          );
          setSelectedIds(validIds);
        } else {
          // 首次使用默认全选
          setSelectedIds(allNotes.map((n) => n.id));
        }
      } catch (e) {
        console.error("Failed to load notes:", e);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // 监听来自托盘的导出事件（在独立窗口中不需要监听，直接通过按钮操作）
  // 导出面板窗口是独立的，用户直接在面板中操作

  // 保存选择到记忆
  const saveSelection = useCallback(
    async (ids) => {
      try {
        await invoke("set_export_selected_ids", { ids });
      } catch (e) {
        console.error("Failed to save selection:", e);
      }
    },
    []
  );

  // 切换选择
  const toggleSelect = useCallback(
    (id) => {
      setSelectedIds((prev) => {
        const next = prev.includes(id)
          ? prev.filter((i) => i !== id)
          : [...prev, id];
        saveSelection(next);
        return next;
      });
    },
    [saveSelection]
  );

  // 全选/取消全选
  const toggleAll = useCallback(() => {
    const next =
      selectedIds.length === notes.length ? [] : notes.map((n) => n.id);
    setSelectedIds(next);
    saveSelection(next);
  }, [notes, selectedIds, saveSelection]);

  // 复制式导出
  const doCopyExport = useCallback(async () => {
    try {
      await invoke("export_notes_copy", { ids: selectedIds });
      setMessage(t("export.success"));
      setTimeout(() => setMessage(""), 2000);
    } catch (e) {
      console.error("Export failed:", e);
      setMessage(t("export.failed"));
      setTimeout(() => setMessage(""), 2000);
    }
  }, [selectedIds]);

  // 剪切式导出
  const doCutExport = useCallback(async () => {
    try {
      await invoke("export_notes_cut", { ids: selectedIds });
      setMessage(t("export.cutSuccess"));
      setShowCutConfirm(false);
      setTimeout(() => setMessage(""), 2000);
      // 重新加载便签列表（内容已清空）
      const allNotes = await invoke("load_all_notes");
      setNotes(allNotes);
    } catch (e) {
      console.error("Cut export failed:", e);
      setMessage(t("export.failed"));
      setTimeout(() => setMessage(""), 2000);
    }
  }, [selectedIds]);

  if (loading) {
    return <div className={styles.panel}>{t("export.loading")}</div>;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>{t("export.title")}</h3>
        <button className={styles.toggleAllBtn} onClick={toggleAll}>
          {selectedIds.length === notes.length
            ? t("export.deselectAll")
            : t("export.selectAll")}
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
          </label>
        ))}
      </div>

      <div className={styles.actions}>
        <button
          className={styles.copyBtn}
          onClick={doCopyExport}
          disabled={selectedIds.length === 0}
        >
          {t("export.copy")}
        </button>
        <button
          className={styles.cutBtn}
          onClick={() => setShowCutConfirm(true)}
          disabled={selectedIds.length === 0}
        >
          {t("export.cut")}
        </button>
      </div>

      {message && <div className={styles.message}>{message}</div>}

      {showCutConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog}>
            <p>{t("export.cutConfirm")}</p>
            <div className={styles.confirmActions}>
              <button className={styles.confirmOk} onClick={doCutExport}>
                {t("export.confirm")}
              </button>
              <button
                className={styles.confirmCancel}
                onClick={() => setShowCutConfirm(false)}
              >
                {t("export.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
