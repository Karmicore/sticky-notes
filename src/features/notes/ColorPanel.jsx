import { useCallback } from "react";
import { COLORS } from "../../constants";
import { t } from "../../lib/i18n";
import styles from "./styles/ColorPanel.module.css";

export default function ColorPanel({ note, update, onClose }) {
  const handleColorChange = useCallback((hex) => {
    update({ color: hex });
  }, [update]);

  const handleOpacityChange = useCallback((e) => {
    update({ opacity: Number(e.target.value) / 100 });
  }, [update]);

  const handleGlassChange = useCallback((e) => {
    update({ glass: Number(e.target.value) / 100 });
  }, [update]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.section}>
          <div className={styles.label}>{t("menu.color")}</div>
          <div className={styles.colors}>
            {COLORS.map(({ hex, name }) => (
              <button
                key={hex}
                className={`${styles.swatch} ${note.color === hex ? styles.swatchActive : ""}`}
                style={{ backgroundColor: hex }}
                title={typeof name === "function" ? name() : name}
                onClick={() => handleColorChange(hex)}
              />
            ))}
          </div>
        </div>
        <div className={styles.section}>
          <div className={`${styles.label} ${styles.opacityLabel}`}>
            <span>{t("menu.opacity")}</span>
            <span className={styles.opacityValue}>{Math.round(note.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            className={styles.slider}
            min={10}
            max={100}
            value={Math.round(note.opacity * 100)}
            onChange={handleOpacityChange}
          />
        </div>
        <div className={styles.section}>
          <div className={`${styles.label} ${styles.opacityLabel}`}>
            <span>{t("menu.glass")}</span>
            <span className={styles.opacityValue}>{Math.round(note.glass * 100)}%</span>
          </div>
          <input
            type="range"
            className={styles.slider}
            min={0}
            max={100}
            value={Math.round(note.glass * 100)}
            onChange={handleGlassChange}
          />
        </div>
      </div>
    </div>
  );
}
