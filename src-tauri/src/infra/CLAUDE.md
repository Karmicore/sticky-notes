# M2 — Persistence (SQLite)

## You Own
- `sqlite_storage.rs` — SqliteStorage struct, NoteRepository impl, schema/migrations

## Contract
- Implements `NoteRepository` trait from M1 (app_core/repository.rs)
- Row-to-Note mapping must match Note struct field order exactly
- DB path: `~/.stickynotes/notes.db`

## Rules
- Do NOT import `tauri::*` or any frontend code
- Schema changes: add migration SQL in `init_schema()` — each ALTER TABLE as separate statement
- New columns must have DEFAULT values for backward compatibility
- row_to_note field order must match SELECT column order — update both together
- Always use `Mutex<Connection>` for thread safety

## Test
```bash
cd src-tauri && cargo test infra
```

## Migration Pattern
```rust
// Each ALTER TABLE as separate statement so one failure doesn't roll back others
for sql in [
    "ALTER TABLE notes ADD COLUMN new_col TYPE DEFAULT val",
] {
    let _ = conn.execute_batch(sql); // ignore "duplicate column" errors
}
```

## Files
```
sqlite_storage.rs   SqliteStorage, init_schema, row_to_note, NoteRepository impl, 14 tests
```
