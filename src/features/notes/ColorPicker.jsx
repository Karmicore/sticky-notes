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
  const hsvRef = useRef(hsv);
  const svRef = useRef(null);
  const hueRef = useRef(null);
  const dragging = useRef(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => { hsvRef.current = hsv; }, [hsv]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Sync from parent color prop
  useEffect(() => {
    if (color) setHsv(hexToHsv(color));
  }, [color]);

  // Draw SV panel (only when hue changes)
  useEffect(() => {
    const canvas = svRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [r, g, b] = hsvToRgb(hsv[0], 1, 1);
    const gradH = ctx.createLinearGradient(0, 0, w, 0);
    gradH.addColorStop(0, "#fff");
    gradH.addColorStop(1, `rgb(${r},${g},${b})`);
    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, w, h);

    const gradV = ctx.createLinearGradient(0, 0, 0, h);
    gradV.addColorStop(0, "rgba(0,0,0,0)");
    gradV.addColorStop(1, "#000");
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, w, h);
  }, [hsv[0]]);

  // Draw hue strip (once)
  useEffect(() => {
    const canvas = hueRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    for (let i = 0; i <= 6; i++) {
      grad.addColorStop(i / 6, `hsl(${i * 60}, 100%, 50%)`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, []);

  // Single pointer handler — reads from refs, never stale
  const applyPointer = useCallback((e, type) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cur = hsvRef.current;
    if (type === "sv") {
      const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
      setHsv([cur[0], s, v]);
      onChangeRef.current(hsvToHex(cur[0], s, v));
    } else {
      const h = Math.max(0, Math.min(360, ((e.clientY - rect.top) / rect.height) * 360));
      setHsv([h, cur[1], cur[2]]);
      onChangeRef.current(hsvToHex(h, cur[1], cur[2]));
    }
  }, []); // no deps — uses refs

  const handlePointerDown = useCallback((e, type) => {
    e.preventDefault();
    dragging.current = type;
    e.currentTarget.setPointerCapture(e.pointerId);
    applyPointer(e, type);
  }, [applyPointer]);

  const handlePointerMove = useCallback((e) => {
    if (dragging.current) applyPointer(e, dragging.current);
  }, [applyPointer]);

  const handlePointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const [h, s, v] = hsv;
  const cursorX = s * 100;
  const cursorY = (1 - v) * 100;
  const hueY = (h / 360) * 100;

  return (
    <div className={styles.picker}>
      <div className={styles.svWrap}>
        <canvas
          ref={svRef}
          width={180}
          height={180}
          className={styles.svPanel}
          onPointerDown={(e) => handlePointerDown(e, "sv")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
        <div
          className={styles.svCursor}
          style={{ left: `${cursorX}%`, top: `${cursorY}%` }}
        />
      </div>
      <div className={styles.hueWrap}>
        <canvas
          ref={hueRef}
          width={18}
          height={180}
          className={styles.hueStrip}
          onPointerDown={(e) => handlePointerDown(e, "hue")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
        <div
          className={styles.hueCursor}
          style={{ top: `${hueY}%` }}
        />
      </div>
    </div>
  );
}
