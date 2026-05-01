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
  const parts = hash.slice(6).split("/");
  const noteId = parseInt(parts[0], 10);
  if (isNaN(noteId) || !parts[1]) return null;
  try {
    const json = atob(parts[1]);
    return { noteId, note: JSON.parse(json) };
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
