use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::{Connection, params};

use crate::app_core::note::Note;
use crate::app_core::repository::NoteRepository;

pub struct SqliteStorage {
    conn: Mutex<Connection>,
}

impl SqliteStorage {
    pub fn new() -> Self {
        let db_dir = dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join(".stickynotes");
        fs::create_dir_all(&db_dir).ok();
        let db_path = db_dir.join("notes.db");
        Self::open_path(&db_path)
    }

    fn open_path(db_path: &std::path::Path) -> Self {
        let conn = Connection::open(db_path)
            .unwrap_or_else(|e| panic!("failed to open {}: {}", db_path.display(), e));
        Self::init_schema(&conn);
        Self { conn: Mutex::new(conn) }
    }

    #[cfg(test)]
    pub(crate) fn new_memory() -> Self {
        let conn = Connection::open_in_memory().expect("failed to open in-memory db");
        Self::init_schema(&conn);
        Self { conn: Mutex::new(conn) }
    }

    fn init_schema(conn: &Connection) {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS notes (
                id              INTEGER PRIMARY KEY,
                title           TEXT NOT NULL,
                content         TEXT NOT NULL DEFAULT '',
                color           TEXT NOT NULL DEFAULT '#FFEB3B',
                pos_x           INTEGER NOT NULL DEFAULT 100,
                pos_y           INTEGER NOT NULL DEFAULT 100,
                width           INTEGER NOT NULL DEFAULT 260,
                height          INTEGER NOT NULL DEFAULT 320,
                is_always_on_top INTEGER NOT NULL DEFAULT 1,
                font_size       INTEGER NOT NULL DEFAULT 14,
                opacity         REAL NOT NULL DEFAULT 1.0,
                visible         INTEGER NOT NULL DEFAULT 1,
                locked          INTEGER NOT NULL DEFAULT 0,
                collapsed       INTEGER NOT NULL DEFAULT 0,
                expanded_height INTEGER NOT NULL DEFAULT 240,
                expanded_width  INTEGER NOT NULL DEFAULT 260,
                glass           REAL NOT NULL DEFAULT 0.0
            )",
        ).expect("failed to create notes table");

        // Migration: add columns for older databases (each statement separate
        // so a "duplicate column" error on one doesn't roll back the others)
        for sql in [
            "ALTER TABLE notes ADD COLUMN collapsed INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE notes ADD COLUMN expanded_height INTEGER NOT NULL DEFAULT 240",
            "ALTER TABLE notes ADD COLUMN expanded_width INTEGER NOT NULL DEFAULT 260",
            "UPDATE notes SET expanded_height = height WHERE height > 80",
            "UPDATE notes SET expanded_width = width WHERE width > 0",
            "ALTER TABLE notes ADD COLUMN glass REAL NOT NULL DEFAULT 0.0",
        ] {
            let _ = conn.execute_batch(sql);
        }
    }

    fn row_to_note(row: &rusqlite::Row) -> rusqlite::Result<Note> {
        Ok(Note {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            color: row.get(3)?,
            pos_x: row.get(4)?,
            pos_y: row.get(5)?,
            width: row.get::<_, u32>(6)?,
            height: row.get::<_, u32>(7)?,
            is_always_on_top: row.get::<_, i32>(8)? != 0,
            font_size: row.get::<_, u32>(9)?,
            opacity: row.get(10)?,
            visible: row.get::<_, i32>(11)? != 0,
            locked: row.get::<_, i32>(12)? != 0,
            collapsed: row.get::<_, i32>(13)? != 0,
            expanded_height: row.get::<_, u32>(14)?,
            expanded_width: row.get::<_, u32>(15)?,
            glass: row.get(16)?,
        })
    }
}

impl NoteRepository for SqliteStorage {
    fn load_all(&self) -> Result<Vec<Note>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, title, content, color, pos_x, pos_y, width, height, is_always_on_top, font_size, opacity, visible, locked, collapsed, expanded_height, expanded_width, glass FROM notes")
            .map_err(|e| e.to_string())?;

        let notes = stmt
            .query_map([], Self::row_to_note)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        Ok(notes)
    }

    fn load(&self, id: i32) -> Result<Note, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT id, title, content, color, pos_x, pos_y, width, height, is_always_on_top, font_size, opacity, visible, locked, collapsed, expanded_height, expanded_width, glass FROM notes WHERE id = ?1",
            params![id],
            Self::row_to_note,
        )
        .map_err(|e| e.to_string())
    }

    fn save(&self, note: &Note) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO notes (id, title, content, color, pos_x, pos_y, width, height, is_always_on_top, font_size, opacity, visible, locked, collapsed, expanded_height, expanded_width, glass) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
            params![
                note.id,
                note.title,
                note.content,
                note.color,
                note.pos_x,
                note.pos_y,
                note.width,
                note.height,
                note.is_always_on_top as i32,
                note.font_size,
                note.opacity,
                note.visible as i32,
                note.locked as i32,
                note.collapsed as i32,
                note.expanded_height,
                note.expanded_width,
                note.glass,
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn delete(&self, id: i32) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM notes WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_note(id: i32) -> Note {
        Note {
            id,
            title: format!("Test {}", id),
            content: "hello world".into(),
            color: "#FFEB3B".into(),
            pos_x: 100,
            pos_y: 200,
            width: 260,
            height: 320,
            is_always_on_top: true,
            font_size: 14,
            opacity: 1.0,
            visible: true,
            locked: false,
            collapsed: false,
            expanded_height: 320,
            expanded_width: 260,
            glass: 0.0,
        }
    }

    #[test]
    fn save_load_roundtrip() {
        let db = SqliteStorage::new_memory();
        let note = sample_note(1);
        db.save(&note).unwrap();
        let loaded = db.load(1).unwrap();
        assert_eq!(loaded.id, 1);
        assert_eq!(loaded.title, "Test 1");
        assert_eq!(loaded.content, "hello world");
        assert_eq!(loaded.color, "#FFEB3B");
        assert_eq!(loaded.pos_x, 100);
        assert_eq!(loaded.pos_y, 200);
        assert_eq!(loaded.width, 260);
        assert_eq!(loaded.height, 320);
        assert!(loaded.is_always_on_top);
        assert_eq!(loaded.font_size, 14);
        assert!((loaded.opacity - 1.0).abs() < f64::EPSILON);
        assert!(loaded.visible);
        assert!(!loaded.locked);
        assert!(!loaded.collapsed);
    }

    #[test]
    fn load_nonexistent_returns_err() {
        let db = SqliteStorage::new_memory();
        assert!(db.load(999).is_err());
    }

    #[test]
    fn delete_nonexistent_succeeds() {
        let db = SqliteStorage::new_memory();
        // DELETE on missing row is not an error (0 rows affected)
        assert!(db.delete(999).is_ok());
    }

    #[test]
    fn load_all_empty() {
        let db = SqliteStorage::new_memory();
        let notes = db.load_all().unwrap();
        assert!(notes.is_empty());
    }

    #[test]
    fn load_all_multiple() {
        let db = SqliteStorage::new_memory();
        db.save(&sample_note(1)).unwrap();
        db.save(&sample_note(2)).unwrap();
        db.save(&sample_note(3)).unwrap();
        let notes = db.load_all().unwrap();
        assert_eq!(notes.len(), 3);
    }

    #[test]
    fn insert_or_replace_updates_existing() {
        let db = SqliteStorage::new_memory();
        let mut note = sample_note(1);
        db.save(&note).unwrap();

        note.title = "Updated".into();
        note.content = "changed content".into();
        db.save(&note).unwrap();

        let loaded = db.load(1).unwrap();
        assert_eq!(loaded.title, "Updated");
        assert_eq!(loaded.content, "changed content");
        // Only one record, not two
        assert_eq!(db.load_all().unwrap().len(), 1);
    }

    #[test]
    fn delete_removes_note() {
        let db = SqliteStorage::new_memory();
        db.save(&sample_note(1)).unwrap();
        db.save(&sample_note(2)).unwrap();
        db.delete(1).unwrap();
        assert!(db.load(1).is_err());
        assert_eq!(db.load_all().unwrap().len(), 1);
    }

    #[test]
    fn negative_id_works() {
        let db = SqliteStorage::new_memory();
        let note = sample_note(-1);
        db.save(&note).unwrap();
        let loaded = db.load(-1).unwrap();
        assert_eq!(loaded.id, -1);
    }

    #[test]
    fn zero_id_works() {
        let db = SqliteStorage::new_memory();
        let note = sample_note(0);
        db.save(&note).unwrap();
        let loaded = db.load(0).unwrap();
        assert_eq!(loaded.id, 0);
    }

    #[test]
    fn negative_position_works() {
        let db = SqliteStorage::new_memory();
        let mut note = sample_note(1);
        note.pos_x = -500;
        note.pos_y = -300;
        db.save(&note).unwrap();
        let loaded = db.load(1).unwrap();
        assert_eq!(loaded.pos_x, -500);
        assert_eq!(loaded.pos_y, -300);
    }

    #[test]
    fn zero_dimensions_works() {
        let db = SqliteStorage::new_memory();
        let mut note = sample_note(1);
        note.width = 0;
        note.height = 0;
        db.save(&note).unwrap();
        let loaded = db.load(1).unwrap();
        assert_eq!(loaded.width, 0);
        assert_eq!(loaded.height, 0);
    }

    #[test]
    fn opacity_boundary_values() {
        let db = SqliteStorage::new_memory();

        let mut note = sample_note(1);
        note.opacity = 0.0;
        db.save(&note).unwrap();
        let loaded = db.load(1).unwrap();
        assert!((loaded.opacity - 0.0).abs() < f64::EPSILON);

        note.opacity = 1.0;
        note.id = 2;
        db.save(&note).unwrap();
        let loaded = db.load(2).unwrap();
        assert!((loaded.opacity - 1.0).abs() < f64::EPSILON);
    }

    #[test]
    fn unicode_content_preserved() {
        let db = SqliteStorage::new_memory();
        let mut note = sample_note(1);
        note.title = "便签标题 🎉".into();
        note.content = "中文内容\n换行\n特殊字符: <>&\"'".into();
        db.save(&note).unwrap();
        let loaded = db.load(1).unwrap();
        assert_eq!(loaded.title, "便签标题 🎉");
        assert_eq!(loaded.content, "中文内容\n换行\n特殊字符: <>&\"'");
    }

    #[test]
    fn all_bool_fields_roundtrip() {
        let db = SqliteStorage::new_memory();
        let note = Note {
            id: 1,
            is_always_on_top: false,
            visible: false,
            locked: true,
            collapsed: true,
            ..sample_note(1)
        };
        db.save(&note).unwrap();
        let loaded = db.load(1).unwrap();
        assert!(!loaded.is_always_on_top);
        assert!(!loaded.visible);
        assert!(loaded.locked);
        assert!(loaded.collapsed);
    }

    #[test]
    fn migration_idempotent() {
        // init_schema runs migration SQL; calling it twice should not fail
        let db = SqliteStorage::new_memory();
        let conn = db.conn.lock().unwrap();
        // Re-run the migration statements — "duplicate column" errors are ignored
        for sql in [
            "ALTER TABLE notes ADD COLUMN collapsed INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE notes ADD COLUMN expanded_height INTEGER NOT NULL DEFAULT 240",
            "ALTER TABLE notes ADD COLUMN expanded_width INTEGER NOT NULL DEFAULT 260",
        ] {
            let result = conn.execute_batch(sql);
            // These SHOULD fail with "duplicate column" since schema already has them
            assert!(result.is_err(), "Expected duplicate column error for: {}", sql);
        }
    }

    #[test]
    fn collapse_state_roundtrip() {
        let db = SqliteStorage::new_memory();
        let note = Note {
            id: 1,
            collapsed: true,
            expanded_width: 300,
            expanded_height: 400,
            width: 300,
            height: 28, // collapsed height
            ..sample_note(1)
        };
        db.save(&note).unwrap();
        let loaded = db.load(1).unwrap();
        assert!(loaded.collapsed);
        assert_eq!(loaded.expanded_width, 300);
        assert_eq!(loaded.expanded_height, 400);
        assert_eq!(loaded.height, 28);
    }

    #[test]
    fn collapse_expand_dimensions_preserved() {
        // Simulate: user has 200x250 window, collapses, then expands
        let db = SqliteStorage::new_memory();
        let mut note = sample_note(1);
        note.width = 200;
        note.height = 250;
        db.save(&note).unwrap();

        // Collapse: save real dimensions, shrink height
        let mut loaded = db.load(1).unwrap();
        loaded.expanded_width = loaded.width;  // 200
        loaded.expanded_height = loaded.height; // 250
        loaded.width = loaded.expanded_width;
        loaded.height = 28;
        loaded.collapsed = true;
        db.save(&loaded).unwrap();

        // Expand: restore saved dimensions
        let mut loaded = db.load(1).unwrap();
        assert_eq!(loaded.expanded_width, 200);
        assert_eq!(loaded.expanded_height, 250);
        loaded.width = loaded.expanded_width;
        loaded.height = loaded.expanded_height;
        loaded.collapsed = false;
        db.save(&loaded).unwrap();

        let final_note = db.load(1).unwrap();
        assert!(!final_note.collapsed);
        assert_eq!(final_note.width, 200);
        assert_eq!(final_note.height, 250);
    }

    #[test]
    fn narrow_window_dimensions_preserved() {
        // Regression: window narrower than min_width should not be clamped on save
        let db = SqliteStorage::new_memory();
        let note = Note {
            id: 1,
            width: 120,
            height: 200,
            expanded_width: 120,
            expanded_height: 200,
            collapsed: false,
            ..sample_note(1)
        };
        db.save(&note).unwrap();
        let loaded = db.load(1).unwrap();
        assert_eq!(loaded.width, 120);
        assert_eq!(loaded.expanded_width, 120);
        assert_eq!(loaded.expanded_height, 200);
    }

    #[test]
    fn save_update_save_preserves_data() {
        // Simulate: create note, edit content, save again
        let db = SqliteStorage::new_memory();
        let note = sample_note(1);
        db.save(&note).unwrap();

        let mut loaded = db.load(1).unwrap();
        loaded.content = "updated content".into();
        loaded.font_size = 20;
        loaded.opacity = 0.7;
        db.save(&loaded).unwrap();

        let final_note = db.load(1).unwrap();
        assert_eq!(final_note.content, "updated content");
        assert_eq!(final_note.font_size, 20);
        assert!((final_note.opacity - 0.7).abs() < f64::EPSILON);
        // Original fields preserved
        assert_eq!(final_note.title, "Test 1");
        assert_eq!(final_note.color, "#FFEB3B");
        assert_eq!(final_note.pos_x, 100);
    }

    #[test]
    fn large_content_persistence() {
        let db = SqliteStorage::new_memory();
        let big_content = "x".repeat(50_000);
        let note = Note {
            id: 1,
            content: big_content.clone(),
            ..sample_note(1)
        };
        db.save(&note).unwrap();
        let loaded = db.load(1).unwrap();
        assert_eq!(loaded.content.len(), 50_000);
        assert_eq!(loaded.content, big_content);
    }

    #[test]
    fn all_fields_independent_after_load() {
        // Changing one loaded field should not affect the DB
        let db = SqliteStorage::new_memory();
        db.save(&sample_note(1)).unwrap();

        let mut loaded = db.load(1).unwrap();
        loaded.title = "Modified".into();
        // Don't save — just drop it

        let from_db = db.load(1).unwrap();
        assert_eq!(from_db.title, "Test 1"); // unchanged
    }

    #[test]
    fn concurrent_saves() {
        use std::sync::Arc;
        use std::thread;

        let db = Arc::new(SqliteStorage::new_memory());
        let mut handles = vec![];

        for i in 0..10 {
            let db_clone = Arc::clone(&db);
            handles.push(thread::spawn(move || {
                let note = sample_note(i);
                db_clone.save(&note).unwrap();
            }));
        }

        for h in handles {
            h.join().unwrap();
        }

        let notes = db.load_all().unwrap();
        assert_eq!(notes.len(), 10);
    }
}
