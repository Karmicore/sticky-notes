import { getCurrentWindow } from "@tauri-apps/api/window";
import { useNote } from "./hooks/useNote";
import { useKeyboard } from "./hooks/useKeyboard";
import { useWindowLifecycle } from "./hooks/useWindowLifecycle";
import NoteWindow from "./components/NoteWindow";
import "./App.css";

function getNoteId() {
  const label = getCurrentWindow().label;
  return label.startsWith("note-") ? parseInt(label.slice(5), 10) : null;
}

export default function App() {
  const noteId = getNoteId();
  const { note, noteRef, update, changeFontSize, changeOpacity, saveNow } = useNote(noteId);

  useKeyboard({ note, noteRef, update, changeFontSize, changeOpacity });
  useWindowLifecycle(noteId, saveNow);

  if (!note) return null;

  return <NoteWindow note={note} update={update} changeFontSize={changeFontSize} changeOpacity={changeOpacity} />;
}
