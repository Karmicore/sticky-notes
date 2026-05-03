import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import { getLocale, setLocale } from "./lib/locale";
import { useNote } from "./features/notes/hooks/useNote";
import { useAutoSave } from "./features/notes/hooks/useAutoSave";
import { useWindowLifecycle } from "./features/notes/hooks/useWindowLifecycle";
import NoteWindow from "./features/notes/NoteWindow";
import ExportPopup from "./features/notes/ExportPopup";

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
  if (label === "export") {
    return <ExportPopup />;
  }

  if (label.startsWith("note-")) {
    const noteId = parseInt(label.slice(5), 10);
    return <NoteRoute noteId={noteId} />;
  }

  return <div style={{ padding: 16, color: "#999" }}>Unknown window: {label}</div>;
}

function Root() {
  // Force full remount when language changes
  const [langKey, setLangKey] = useState(0);

  useEffect(() => {
    // Initialize locale from config
    getLocale();

    const unlisten = listen("language-changed", ({ payload: lang }) => {
      const resolved = lang === "auto"
        ? (navigator.language || "en").toLowerCase().startsWith("zh") ? "zh" : "en"
        : lang;
      setLocale(resolved);
      // Bump key → React unmounts entire tree and remounts with new locale
      setLangKey((k) => k + 1);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  return <App key={langKey} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
