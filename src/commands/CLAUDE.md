# M5 — Command System (Frontend)

## You Own
- `registry.js` — Command definitions and registration
- `menu.js` — Menu structure builder
- `keys.js` — Keyboard shortcut mappings
- `../lib/nativeMenu.js` — Native menu client
- `../constants.js` — Shared constants

## Contract
- **Schema**: `contracts/frontend-commands.md` — command definitions documented here
- Commands receive `ctx` object with business logic callbacks
- `run()` function dispatches commands by name

## Rules
- Do NOT import from `src-tauri/`
- Do NOT directly import feature code — use `ctx` callbacks
- New commands: add to registry.js + sync frontend-commands.md
- Keep command definitions declarative (name, label, shortcut, run)

## Files
```
registry.js        Command registration, run() dispatcher
menu.js            Menu structure definition (nested items)
keys.js            Keyboard shortcut bindings
../lib/nativeMenu.js  Native menu construction via Tauri
../constants.js    Shared constants (colors, sizes, etc.)
```
