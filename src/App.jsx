import { getCurrentWindow } from "@tauri-apps/api/window";
import { useNote } from "./features/notes/useNote";
import { useWindowLifecycle } from "./features/notes/useWindowLifecycle";
import NoteWindow from "./features/notes/NoteWindow";
import "./App.css";

function getNoteId() {
  const label = getCurrentWindow().label;
  return label.startsWith("note-") ? parseInt(label.slice(5), 10) : null;
}

export default function App() {
  const noteId = getNoteId();
  const { note, update, changeFontSize, changeOpacity, saveNow } = useNote(noteId);

  useWindowLifecycle(noteId, saveNow);

  if (!note) return null;

  return <NoteWindow noteId={noteId} note={note} update={update} changeFontSize={changeFontSize} changeOpacity={changeOpacity} />;
}
