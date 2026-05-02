# Sticky Notes — Tauri 2.x + React

## Module Router

This project has 6 modules. When working on a task, identify the target module from the file path:

| Path pattern | Module | Read its CLAUDE.md |
|---|---|---|
| `src-tauri/src/app_core/` | M1 domain | `src-tauri/src/app_core/CLAUDE.md` |
| `src-tauri/src/infra/` | M2 persistence | `src-tauri/src/infra/CLAUDE.md` |
| `src-tauri/src/commands/` + `plugins/` + `lib.rs` | M3 tauri-bridge | `src-tauri/src/CLAUDE.md` |
| `src/features/notes/` | M4 note-feature | `src/features/notes/CLAUDE.md` |
| `src/commands.js` + `src/core/menu/` | M5 command-system | `src/commands/CLAUDE.md` |
| `contracts/` | Shared contracts | Read directly, no routing needed |

## Multi-Agent Workflow

When given a task that spans multiple modules:
1. Identify affected modules from the file paths above
2. For each module, spawn a sub-agent scoped to that module's directory
3. Each sub-agent reads its own CLAUDE.md for constraints
4. Contracts in `contracts/` are the source of truth for cross-module interfaces

## Quick Commands

- `npm run tauri dev` — run the app
- `cd src-tauri && cargo test` — Rust tests
- `npm test` — frontend tests (if configured)

## Architecture

```
app_core (domain) → infra (persistence) → commands/plugins (tauri-bridge)
     ↑ Note struct, traits        ↑ SQLite impl         ↑ Tauri commands
     └──────── contracts/note-schema.json ────────────────┘
                                                    ↓ invoke()
                                            src/features/notes/ (React UI)
```
