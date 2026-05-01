import { useState, useEffect, useRef } from "react";

const COLORS = [
  "#FFEB3B", "#BBDEFB", "#C8E6C9", "#F8BBD9",
  "#E1BEE7", "#FFE0B2", "#FFFFFF", "#90CAF9",
  "#A5D6A7", "#EF9A9A", "#F48FB1", "#E0E0E0",
];
const OPACITIES = [20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function NoteMenu({ note, onClose, onNew, onDup, onDelete, onHide, onPin, onLock, onRename, onFontUp, onFontDown, onColor, onOpacity }) {
  const [sub, setSub] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const I = (label, key, fn, danger) => (
    <div className={`ctx-item${danger ? " ctx-danger" : ""}`} onClick={() => { fn(); onClose(); }}>
      <span className="ctx-label">{label}</span>{key && <span className="ctx-shortcut">{key}</span>}
    </div>
  );

  return (
    <div ref={ref} className="context-menu" onClick={(e) => e.stopPropagation()}>
      {I("新建便签", "Ctrl+N", onNew)}
      {I("复制便签", "Ctrl+D", onDup)}
      {I("重命名", "F2", onRename)}
      <div className="ctx-separator" />
      {I("删除", "", onDelete, true)}
      {I("隐藏", "", onHide)}
      <div className="ctx-separator" />
      {I("始终置顶", note.isAlwaysOnTop ? "✓" : "", onPin)}
      {I("锁定便签", note.locked ? "✓" : "", onLock)}
      <div className="ctx-separator" />
      {I("字体增大", "Ctrl++", onFontUp)}
      {I("字体减小", "Ctrl+-", onFontDown)}
      <div className="ctx-item ctx-has-sub" onMouseEnter={() => setSub("op")} onMouseLeave={() => setSub(null)}>
        <span className="ctx-label">透明度</span><span className="ctx-arrow">▸</span>
        {sub === "op" && <div className="ctx-submenu">
          {OPACITIES.map((v) => <div key={v} className={`ctx-sub-item${Math.round(note.opacity * 100) === v ? " active" : ""}`} onClick={() => { onOpacity(v); onClose(); }}>{v}%</div>)}
        </div>}
      </div>
      <div className="ctx-item ctx-has-sub" onMouseEnter={() => setSub("co")} onMouseLeave={() => setSub(null)}>
        <span className="ctx-label">颜色</span><span className="ctx-arrow">▸</span>
        {sub === "co" && <div className="ctx-submenu ctx-color-grid">
          {COLORS.map((c) => <div key={c} className={`ctx-color-swatch${note.color === c ? " active" : ""}`} style={{ backgroundColor: c }} onClick={() => { onColor(c); onClose(); }} />)}
        </div>}
      </div>
    </div>
  );
}
