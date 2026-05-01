import styles from "./NoteEditor.module.css";

export default function NoteEditor({ note, update }) {
  return (
    <textarea
      className={styles.textContent}
      value={note.content}
      placeholder="输入内容..."
      readOnly={note.locked}
      style={{ fontSize: note.fontSize + "px" }}
      onChange={(e) => !note.locked && update({ content: e.target.value })}
    />
  );
}
