# Window Types Contract

Single source of truth for all Tauri window types. When adding a new window type, update this file AND the corresponding locations listed in "Where to touch".

---

## note-{id}

- **Purpose**: Individual sticky note window
- **Label**: `note-{id}` (dynamic, one per note)
- **HTML**: `note.html` → `src/main.jsx`
- **Spawn**: `spawn_note_window()` in `window_cmd.rs`
- **Trigger**: App startup (existing notes) / `create_note_window` / `duplicate_note`
- **Window**: decorations=false, transparent=true, resizable=true, skip_taskbar=true
- **Background**: Transparent (Tauri window transparency + inline backgroundColor on .noteWindow)

## export

- **Purpose**: Select notes for copy/cut export
- **Label**: `export` (singleton)
- **HTML**: `export.html` → `src/main.jsx`
- **Spawn**: `spawn_export_window()` in `window_cmd.rs`
- **Trigger**: Tray menu "Export Settings"
- **Window**: decorations=true, resizable=true, always_on_top=true, skip_taskbar=true
- **Background**: `#fff` (ExportPopup.module.css .panel)

## share

- **Purpose**: Generate and export a progress card image
- **Label**: `share` (singleton)
- **HTML**: `share.html` → `src/main.jsx`
- **Spawn**: `spawn_share_window()` in `window_cmd.rs`
- **Trigger**: Note title bar ↗ button
- **Window**: decorations=true, resizable=true, always_on_top=true, skip_taskbar=true
- **Background**: `#1a1a2e` (ShareWindow.module.css .container)

---

## Where to touch when adding a new window type

1. `contracts/window-types.md` — this file (add entry above)
2. `contracts/tauri-commands.md` — document the invoke command
3. `vite.config.js` — add HTML to `build.rollupOptions.input`
4. New `.html` file in project root (load `/src/main.jsx`)
5. New React component in `src/features/`
6. `src/main.jsx` — add label route in `App()`
7. `src-tauri/src/commands/window_cmd.rs` — add spawn function using `WindowConfig`
8. `src-tauri/src/lib.rs` — register command in `invoke_handler`
9. `src-tauri/capabilities/default.json` — add window label to `windows` array
