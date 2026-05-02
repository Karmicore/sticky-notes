# M3 — Tauri Bridge (commands + plugins + lib.rs)

## You Own
- `commands/note_cmd.rs` — Tauri command handlers for notes
- `commands/window_cmd.rs` — Window spawn/management commands
- `commands/mod.rs` — Command registration
- `plugins/tray.rs` — System tray setup
- `plugins/mod.rs` — Plugin registration
- `lib.rs` — App builder, state injection, command registration
- `main.rs` — Entry point

## Contract
- **API surface**: `contracts/tauri-commands.md` — all invoke() commands documented here
- **Events**: `contracts/tauri-events.md` — backend→frontend events documented here
- Commands receive `State<Arc<NoteService>>` via Tauri dependency injection
- Do NOT modify M1 traits/structs — only consume NoteService

## Rules
- New commands: add `#[tauri::command]` fn + register in lib.rs + sync tauri-commands.md
- New events: use `app.emit()` + sync tauri-events.md
- Window commands use `spawn_note_window()` from window_cmd.rs
- Keep handlers thin — delegate business logic to NoteService

## Test
```bash
cd src-tauri && cargo test
```

## Files
```
commands/note_cmd.rs     get_note, save_note, delete_note, create_note_window, duplicate_note, close_note_window, get_all_notes_rect
commands/window_cmd.rs   spawn_note_window, window configuration
commands/mod.rs          module exports
plugins/tray.rs          system tray, menu items
plugins/mod.rs           module exports
lib.rs                   App::builder, state injection, command/plugin registration
main.rs                  entry point
```
