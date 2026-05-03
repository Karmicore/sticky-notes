# Tauri Commands Contract

Source of truth: `src-tauri/src/lib.rs` (invoke_handler registration)

All commands are invoked from frontend via `invoke("command_name", { args })`.
Parameter names use **camelCase** in JS, mapped to **snake_case** in Rust by Tauri.

---

## Note CRUD

### get_note
- **Args**: `{ id: number }`
- **Returns**: `Note | null`
- **Source**: `commands/note_cmd.rs`

### save_note
- **Args**: `{ note: Note }`
- **Returns**: `void`
- **Source**: `commands/note_cmd.rs`

### delete_note
- **Args**: `{ id: number }`
- **Returns**: `void`
- **Source**: `commands/note_cmd.rs`

### load_all_notes
- **Args**: none
- **Returns**: `Note[]`
- **Source**: `commands/note_cmd.rs`

### create_note_window
- **Args**: none
- **Returns**: `Note`
- **Behavior**: Creates note in DB + spawns a new window
- **Source**: `commands/note_cmd.rs`

### duplicate_note
- **Args**: `{ sourceId: number }`
- **Returns**: `Note`
- **Behavior**: Copies content/color/size, offsets position by +30px, resets locked/collapsed
- **Source**: `commands/note_cmd.rs`

### close_note_window
- **Args**: `{ id: number }`
- **Returns**: `void`
- **Behavior**: Closes the window, does NOT delete the note from DB
- **Source**: `commands/note_cmd.rs`

### get_all_notes_rect
- **Args**: `{ excludeId: number }`
- **Returns**: `NoteRect[]`
- **Behavior**: Returns position/size of all visible, non-collapsed notes (excluding given ID)
- **Source**: `commands/note_cmd.rs`

```ts
// NoteRect shape
interface NoteRect {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

---

## Window Management

### set_window_always_on_top
- **Args**: `{ onTop: boolean }`
- **Returns**: `void`
- **Source**: `commands/window_cmd.rs`

### show_all_notes
- **Args**: none
- **Returns**: `void`
- **Source**: `commands/window_cmd.rs`

### hide_all_notes
- **Args**: none
- **Returns**: `void`
- **Source**: `commands/window_cmd.rs`

### open_export_window
- **Args**: none
- **Returns**: `void`
- **Behavior**: Opens/focuses the export popup window
- **Source**: `commands/window_cmd.rs`

### toggle_note_collapsed
- **Args**: `{ noteId: number }`
- **Returns**: `Note` (updated)
- **Behavior**: Toggles collapsed state, saves expanded dimensions before collapse
- **Source**: `commands/window_cmd.rs`

### collapse_all_notes
- **Args**: none
- **Returns**: `void`
- **Source**: `commands/window_cmd.rs`

### expand_all_notes
- **Args**: none
- **Returns**: `void`
- **Source**: `commands/window_cmd.rs`

---

## Export

### export_notes_copy
- **Args**: `{ ids: number[] }`
- **Returns**: `void`
- **Behavior**: Copies markdown-formatted notes to clipboard (notes preserved)
- **Source**: `commands/export_cmd.rs`

**Markdown format**:
```
标题1
内容1
```
```
标题2
内容2
```

### export_notes_cut
- **Args**: `{ ids: number[] }`
- **Returns**: `void`
- **Behavior**: Copies to clipboard + clears note content
- **Source**: `commands/export_cmd.rs`

---

## Config

### get_export_selected_ids
- **Args**: none
- **Returns**: `number[]`
- **Behavior**: Returns saved export selection from `~/.stickynotes/config.json`
- **Source**: `commands/config_cmd.rs`

### set_export_selected_ids
- **Args**: `{ ids: number[] }`
- **Returns**: `void`
- **Behavior**: Saves export selection to config
- **Source**: `commands/config_cmd.rs`

---

## Usage Example (Frontend)

```js
import { invoke } from "@tauri-apps/api/core";

// Create a new note and get its data
const note = await invoke("create_note_window");

// Save with updated content
await invoke("save_note", { note: { ...note, content: "new text" } });

// Export selected notes to clipboard
await invoke("export_notes_copy", { ids: [1, 2, 3] });
```
