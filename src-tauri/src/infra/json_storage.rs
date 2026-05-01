use std::fs;
use std::path::PathBuf;

use crate::app_core::note::Note;
use crate::app_core::repository::NoteRepository;

pub struct JsonStorage {
    data_dir: PathBuf,
}

impl JsonStorage {
    pub fn new() -> Self {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let data_dir = home.join(".stickynotes").join("notes");
        fs::create_dir_all(&data_dir).ok();
        Self { data_dir }
    }

    fn note_path(&self, id: i32) -> PathBuf {
        self.data_dir.join(format!("note_{}.json", id))
    }
}

impl NoteRepository for JsonStorage {
    fn load_all(&self) -> Result<Vec<Note>, String> {
        let mut notes = Vec::new();
        if let Ok(entries) = fs::read_dir(&self.data_dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("note_") && name.ends_with(".json") {
                    if let Ok(content) = fs::read_to_string(entry.path()) {
                        if let Ok(note) = serde_json::from_str::<Note>(&content) {
                            notes.push(note);
                        }
                    }
                }
            }
        }
        Ok(notes)
    }

    fn load(&self, id: i32) -> Result<Note, String> {
        let path = self.note_path(id);
        if !path.exists() {
            return Err(format!("Note {} not found", id));
        }
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    }

    fn save(&self, note: &Note) -> Result<(), String> {
        let path = self.note_path(note.id);
        let content = serde_json::to_string_pretty(note).map_err(|e| e.to_string())?;
        fs::write(&path, content).map_err(|e| e.to_string())
    }

    fn delete(&self, id: i32) -> Result<(), String> {
        let path = self.note_path(id);
        if path.exists() {
            fs::remove_file(&path).map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}
