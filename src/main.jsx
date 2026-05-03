import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";
import { useNote } from "./features/notes/hooks/useNote";
import { useAutoSave } from "./features/notes/hooks/useAutoSave";
import { useWindowLifecycle } from "./features/notes/hooks/useWindowLifecycle";
import NoteWindow from "./features/notes/NoteWindow";

const appWindow = getCurrentWindow();
const label = appWindow.label;

function NoteRoute({ noteId }) {
  const { note, update } = useNote(noteId);
  const { saveNow, edit, cancel } = useAutoSave(note, update);
  useWindowLifecycle(noteId, saveNow, edit);

  if (!note) return null;
  return <NoteWindow noteId={noteId} note={note} update={update} edit={edit} saveNow={saveNow} cancel={cancel} />;
}

function App() {
  if (label.startsWith("note-")) {
    const noteId = parseInt(label.slice(5), 10);
    return <NoteRoute noteId={noteId} />;
  }

  return <div style={{ padding: 16, color: "#999" }}>Unknown window: {label}</div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
