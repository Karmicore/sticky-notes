import { getCurrentWindow } from "@tauri-apps/api/window";
import { useNote } from "./features/notes/useNote";
import { useWindowLifecycle } from "./features/notes/useWindowLifecycle";
import NoteWindow from "./features/notes/NoteWindow";
import MenuWindow from "./features/menu/MenuWindow";
import "./App.css";

function getNoteId() {
  const label = getCurrentWindow().label;
  return label.startsWith("note-") ? parseInt(label.slice(5), 10) : null;
}

function getMenuNoteId() {
  const label = getCurrentWindow().label;
  return label.startsWith("menu-") ? parseInt(label.slice(5), 10) : null;
}

function parseMenuNote() {
  const hash = window.location.hash;
  if (!hash.startsWith("#menu/")) return null;
  const slashIdx = hash.indexOf("/", 6);
  if (slashIdx === -1) return null;
  const noteId = parseInt(hash.slice(6, slashIdx), 10);
  if (isNaN(noteId)) return null;
  const jsonStr = hash.slice(slashIdx + 1);
  try {
    return { noteId, note: JSON.parse(jsonStr) };
  } catch {
    return null;
  }
}

function NoteRoute() {
  const noteId = getNoteId();
  const { note, update, changeFontSize, changeOpacity, saveNow } = useNote(noteId);
  useWindowLifecycle(noteId, saveNow);
  if (!note) return null;
  return <NoteWindow noteId={noteId} note={note} update={update} changeFontSize={changeFontSize} changeOpacity={changeOpacity} />;
}

function MenuRoute() {
  const parsed = parseMenuNote();
  if (!parsed) return null;
  return <MenuWindow noteId={parsed.noteId} note={parsed.note} />;
}

export default function App() {
  const label = getCurrentWindow().label;
  if (label.startsWith("menu-")) return <MenuRoute />;
  return <NoteRoute />;
}
