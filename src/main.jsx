import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";
import { useNote } from "./features/notes/hooks/useNote";
import { useAutoSave } from "./features/notes/hooks/useAutoSave";
import { useWindowLifecycle } from "./features/notes/hooks/useWindowLifecycle";
import NoteWindow from "./features/notes/NoteWindow";

const noteId = (() => {
  const label = getCurrentWindow().label;
  return label.startsWith("note-") ? parseInt(label.slice(5), 10) : null;
})();

function NoteRoute() {
  const { note, update } = useNote(noteId);
  const { saveNow, edit, cancel } = useAutoSave(note, update);
  useWindowLifecycle(noteId, saveNow, edit);

  if (!note) return null;
  return <NoteWindow noteId={noteId} note={note} update={update} edit={edit} saveNow={saveNow} cancel={cancel} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<NoteRoute />);
