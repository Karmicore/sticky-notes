import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";
import App from "./App.jsx";

const label = getCurrentWindow().label;

if (label.startsWith("menu-")) {
  const { default: MenuWindow } = await import("./features/menu/MenuWindow.jsx");
  ReactDOM.createRoot(document.getElementById("root")).render(<MenuWindow />);
} else {
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
}
