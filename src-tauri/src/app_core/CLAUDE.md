# M1 — Domain Model & Business Logic

## You Own
- `note.rs` — Note struct, serde attributes, Default impl
- `repository.rs` — NoteRepository trait (load/load_all/save/delete)
- `service.rs` — NoteService business logic (create/duplicate/save/delete)

## Contract
- **Schema source of truth**: `contracts/note-schema.json` — keep Note struct in sync
- Serde field names use camelCase for frontend compatibility (x/y, isAlwaysOnTop, fontSize)
- NoteRepository trait is the interface boundary with M2 (infra)

## Rules
- Do NOT import `tauri::*`, `rusqlite`, or any infra-specific crate
- Do NOT add persistence logic here — that belongs in M2
- New Note fields: update note.rs + note-schema.json + sqlite_storage.rs row_to_note
- New service methods: add test in service.rs using SqliteStorage::new_memory()

## Test
```bash
cd src-tauri && cargo test app_core
```

## Files
```
note.rs          Note struct (16 fields), Default, serde tests
repository.rs    NoteRepository trait (4 methods, Send + Sync)
service.rs       NoteService: create, duplicate, save, delete, load_all_visible
```
