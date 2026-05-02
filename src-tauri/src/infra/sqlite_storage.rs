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

        let conn = Connection::open(&db_path)
            .unwrap_or_else(|e| panic!("failed to open {}: {}", db_path.display(), e));

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
                expanded_width  INTEGER NOT NULL DEFAULT 260
            )",
        ).expect("failed to create notes table");

        // Migration: add columns for older databases
        let _ = conn.execute_batch(
            "ALTER TABLE notes ADD COLUMN collapsed INTEGER NOT NULL DEFAULT 0;
             ALTER TABLE notes ADD COLUMN expanded_height INTEGER NOT NULL DEFAULT 240;
             ALTER TABLE notes ADD COLUMN expanded_width INTEGER NOT NULL DEFAULT 260;
             UPDATE notes SET expanded_height = height WHERE height > 80;
             UPDATE notes SET expanded_width = width WHERE width > 0;",
        );

        Self { conn: Mutex::new(conn) }
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
        })
    }
}

impl NoteRepository for SqliteStorage {
    fn load_all(&self) -> Result<Vec<Note>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, title, content, color, pos_x, pos_y, width, height, is_always_on_top, font_size, opacity, visible, locked, collapsed, expanded_height, expanded_width FROM notes")
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
            "SELECT id, title, content, color, pos_x, pos_y, width, height, is_always_on_top, font_size, opacity, visible, locked, collapsed, expanded_height, expanded_width FROM notes WHERE id = ?1",
            params![id],
            Self::row_to_note,
        )
        .map_err(|e| e.to_string())
    }

    fn save(&self, note: &Note) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO notes (id, title, content, color, pos_x, pos_y, width, height, is_always_on_top, font_size, opacity, visible, locked, collapsed, expanded_height, expanded_width) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
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
