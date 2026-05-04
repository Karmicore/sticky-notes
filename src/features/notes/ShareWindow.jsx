import { useState, useRef, useCallback, useMemo } from "react";
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

function getGradient(color) {
  const c = color?.toUpperCase();
  return GRADIENTS[c] || ["#1a1a2e", "#16213e"];
}

function truncate(str, max) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function parseHash() {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  return {
    text: params.get("text") || "",
    color: params.get("color") || "#FFEB3B",
  };
}

export default function ShareWindow() {
  const { text, color } = useMemo(parseHash, []);
  const [ratio, setRatio] = useState("portrait");
  const [status, setStatus] = useState(null);
  const cardRef = useRef(null);
  const appWindow = getCurrentWindow();
  const quote = useMemo(getRandomQuote, []);

  const gradient = getGradient(color);
  const isPortrait = ratio === "portrait";
  const cardW = isPortrait ? 450 : 640;
  const cardH = isPortrait ? 600 : 360;
  const displayText = truncate(text, 80);

  const generatePng = useCallback(async () => {
    if (!cardRef.current) return null;
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(cardRef.current, {
      width: cardW * 2,
      height: cardH * 2,
      pixelRatio: 2,
    });
    const blob = await fetch(dataUrl).then((r) => r.blob());
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  }, [cardW, cardH]);

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
        defaultPath: `quote-${Date.now()}.png`,
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

  if (!displayText) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.title}>{t("share.title")}</span>
          <button className={styles.closeBtn} onClick={handleClose}>×</button>
        </div>
        <div className={styles.empty}>{t("share.noSelection")}</div>
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
          style={{
            width: cardW,
            height: cardH,
            background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
          }}
        >
          <div className={isPortrait ? styles.cardBodyPortrait : styles.cardBodyLandscape}>
            <div className={styles.quoteText} style={{ fontSize: isPortrait ? 22 : 18 }}>
              "{displayText}"
            </div>
            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              <span className={styles.dividerDot} />
              <span className={styles.dividerLine} />
            </div>
            <div className={styles.encourageText}>{quote}</div>
          </div>
          <div className={styles.branding}>Sticky Notes</div>
        </div>
      </div>

      {status && <div className={styles.status}>{status}</div>}

      <div className={styles.actions}>
        <div className={styles.ratioToggle}>
          <button
            className={`${styles.ratioBtn} ${isPortrait ? styles.ratioActive : ""}`}
            onClick={() => setRatio("portrait")}
          >
            {t("share.portrait")}
          </button>
          <button
            className={`${styles.ratioBtn} ${!isPortrait ? styles.ratioActive : ""}`}
            onClick={() => setRatio("landscape")}
          >
            {t("share.landscape")}
          </button>
        </div>
        <div className={styles.actionBtns}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleCopy}>
            {t("share.copy")}
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave}>
            {t("share.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
