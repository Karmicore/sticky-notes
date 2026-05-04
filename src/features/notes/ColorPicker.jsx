import { useRef, useEffect, useCallback, useState } from "react";
import styles from "./styles/ColorPicker.module.css";

// ── HSV <-> RGB <-> Hex conversion ──

function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

function hexToHsv(hex) {
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
  return [h, s, max];
}

function hsvToHex(h, s, v) {
  const [r, g, b] = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

// ── Component ──

export default function ColorPicker({ color, onChange }) {
  const [hsv, setHsv] = useState(() => hexToHsv(color || "#FFEB3B"));
  const svRef = useRef(null);
  const hueRef = useRef(null);
  const dragging = useRef(null); // "sv" | "hue" | null

  // Sync from parent color prop
  useEffect(() => {
    if (color) {
      setHsv(hexToHsv(color));
    }
  }, [color]);

  // Draw SV panel
  useEffect(() => {
    const canvas = svRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;

    // Base hue color
    const [r, g, b] = hsvToRgb(hsv[0], 1, 1);

    // White → hue gradient (horizontal = saturation)
    const gradH = ctx.createLinearGradient(0, 0, width, 0);
    gradH.addColorStop(0, "#fff");
    gradH.addColorStop(1, `rgb(${r},${g},${b})`);
    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, width, height);

    // Transparent → black gradient (vertical = value)
    const gradV = ctx.createLinearGradient(0, 0, 0, height);
    gradV.addColorStop(0, "rgba(0,0,0,0)");
    gradV.addColorStop(1, "#000");
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, width, height);
  }, [hsv[0]]);

  // Draw hue strip
  useEffect(() => {
    const canvas = hueRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { height } = canvas;
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    for (let i = 0; i <= 6; i++) {
      grad.addColorStop(i / 6, `hsl(${i * 60}, 100%, 50%)`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, height);
  }, []);

  const emitColor = useCallback((h, s, v) => {
    setHsv([h, s, v]);
    onChange(hsvToHex(h, s, v));
  }, [onChange]);

  const handlePointerDown = useCallback((e, type) => {
    e.preventDefault();
    dragging.current = type;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e, type);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!dragging.current) return;
    updateFromPointer(e, dragging.current);
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  function updateFromPointer(e, type) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (type === "sv") {
      const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
      emitColor(hsv[0], s, v);
    } else {
      const h = Math.max(0, Math.min(360, ((e.clientY - rect.top) / rect.height) * 360));
      emitColor(h, hsv[1], hsv[2]);
    }
  }

  const [h, s, v] = hsv;
  const cursorX = s * 100;
  const cursorY = (1 - v) * 100;
  const hueY = (h / 360) * 100;

  return (
    <div className={styles.picker}>
      <div
        ref={svRef}
        className={styles.svPanel}
        onPointerDown={(e) => handlePointerDown(e, "sv")}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          className={styles.svCursor}
          style={{ left: `${cursorX}%`, top: `${cursorY}%` }}
        />
      </div>
      <div
        ref={hueRef}
        className={styles.hueStrip}
        onPointerDown={(e) => handlePointerDown(e, "hue")}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          className={styles.hueCursor}
          style={{ top: `${hueY}%` }}
        />
      </div>
    </div>
  );
}
