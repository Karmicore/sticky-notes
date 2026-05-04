import { useRef } from "react";
import { useDragSnap } from "./hooks/useDragSnap";
import styles from "./styles/TitleBar.module.css";

export default function TitleBar({ note, editingTitle, setEditingTitle, commitTitle, onClose, onMenuToggle, onCollapseToggle }) {
  const ref = useRef(null);

  useDragSnap(ref, { noteId: note.id, onCollapseToggle });

  return (
    <div className={styles.titleBar} ref={ref}>
      {editingTitle ? (
        <input className={styles.titleInput} type="text" defaultValue={note.title} autoFocus
          onBlur={(e) => commitTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle(e.target.value);
            if (e.key === "Escape") setEditingTitle(false);
          }} />
      ) : (
        <span className={styles.titleText}>{note.title}</span>
      )}
      <div className={styles.titleActions}>
        <button className={`${styles.titleBtn} ${styles.menuBtn}`} onClick={(e) => onMenuToggle(e)}>⋯</button>
        <button className={`${styles.titleBtn} ${styles.closeBtn}`} onClick={onClose}>×</button>
      </div>
    </div>
  );
}
