# Tauri Events Contract

Source of truth: `emit()` calls in `src-tauri/` and `listen()` calls in `src/`.

Events flow **backend → frontend** only. Frontend listens via `listen()` from `@tauri-apps/api/event`.

---

## App-Level Events (global, all windows receive)

### quit-app
- **Payload**: `()`
- **Emitter**: `plugins/tray.rs` — tray "Quit" menu click
- **Listener**: `src/features/notes/hooks/useWindowLifecycle.js`
- **Behavior**: Each note window saves its state then closes

### trigger-export
- **Payload**: `"copy" | "cut"`
- **Emitter**: `plugins/tray.rs` — tray "Export" submenu
- **Listener**: Frontend note windows (if needed)
- **Behavior**: Triggers export action from tray menu

---

## Window-Level Events (targeted to specific window)

### note-collapsed-changed
- **Payload**: `[noteId: number, collapsed: boolean]`
- **Emitter**: `commands/window_cmd.rs` — after collapse/expand toggle or bulk operation
- **Listener**: `src/features/notes/hooks/useWindowLifecycle.js`
- **Behavior**: Frontend syncs collapsed state. Filters by `noteId` to ignore events for other windows.
- **Note**: 200ms `transitioning` guard prevents auto-save from overwriting `expanded_width`/`expanded_height`

---

## Usage Example (Frontend)

```js
import { listen } from "@tauri-apps/api/event";

// Listen for collapse state changes
const unlisten = await listen("note-collapsed-changed", ({ payload: [noteId, collapsed] }) => {
  if (noteId !== currentNoteId) return;
  // update local state
});

// Cleanup on unmount
return () => { unlisten(); };
```
