import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";
import { useNote } from "./features/notes/useNote";
import { useWindowLifecycle } from "./features/notes/useWindowLifecycle";
import NoteWindow from "./features/notes/NoteWindow";

function getNoteId() {
  const label = getCurrentWindow().label;
  return label.startsWith("note-") ? parseInt(label.slice(5), 10) : null;
}

function NoteRoute() {
  const noteId = getNoteId();
  const { note, update, changeFontSize, changeOpacity, saveNow } = useNote(noteId);
  useWindowLifecycle(noteId, saveNow);
  if (!note) return null;
  return <NoteWindow noteId={noteId} note={note} update={update} changeFontSize={changeFontSize} changeOpacity={changeOpacity} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<NoteRoute />);
