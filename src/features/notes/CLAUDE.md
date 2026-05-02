# M4 — Note Feature (Frontend UI)

## You Own
- `NoteWindow.jsx` — Main note window component
- `NoteEditor.jsx` — Content editor with auto-save
- `TitleBar.jsx` — Custom title bar with controls
- `hooks/useNote.js` — Note state management, invoke() calls
- `hooks/useWindowLifecycle.js` — Window open/close lifecycle
- `hooks/useDragSnap.js` — Drag with snap-to-edge
- `hooks/useKeyboard.js` — Keyboard shortcuts

## Contract
- **Commands**: `contracts/tauri-commands.md` — invoke() these commands
- **Events**: `contracts/tauri-events.md` — listen() for these events
- All data operations go through `invoke("command_name", { args })` to M3
- Auto-save uses 800ms debounce

## Rules
- Do NOT import anything from `src-tauri/`
- Do NOT access localStorage for note data — always go through Tauri commands
- Use `@tauri-apps/api` for invoke/listen/window operations
- CSS: use CSS modules or scoped styles, no global overrides

## Test
```bash
cd sticky-notes && npm test
```

## Files
```
NoteWindow.jsx       Main note window, layout, event listeners
NoteEditor.jsx       ContentEditable or textarea, auto-save debounce
TitleBar.jsx         Title display, close/collapse/pin buttons
hooks/useNote.js     Note CRUD via invoke(), local state sync
hooks/useWindowLifecycle.js  Window open/close, focus management
hooks/useDragSnap.js Drag positioning, snap-to-edge detection
hooks/useKeyboard.js Keyboard shortcut handlers
```
