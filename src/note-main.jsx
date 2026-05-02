import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { useNote, useAutoSave } from "./features/notes/useNote";
import { useWindowLifecycle } from "./features/notes/useWindowLifecycle";
import NoteWindow from "./features/notes/NoteWindow";

function getNoteId() {
  const label = getCurrentWindow().label;
  return label.startsWith("note-") ? parseInt(label.slice(5), 10) : null;
}

function NoteRoute() {
  const noteId = getNoteId();
  const { note, update } = useNote(noteId);
  const { saveNow, edit } = useAutoSave(note, update);
  useWindowLifecycle(noteId, saveNow, edit);

  // Listen for tray "新建便签" event
  useEffect(() => {
    const unlisten = listen("create-note", () => {
      invoke("create_note_window").catch(console.error);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);
  if (!note) return null;
  return <NoteWindow noteId={noteId} note={note} update={update} edit={edit} saveNow={saveNow} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<NoteRoute />);
