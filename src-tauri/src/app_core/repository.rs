use super::note::Note;

pub trait NoteRepository: Send + Sync {
    fn load_all(&self) -> Result<Vec<Note>, String>;
    fn load(&self, id: i32) -> Result<Note, String>;
    fn save(&self, note: &Note) -> Result<(), String>;
    fn delete(&self, id: i32) -> Result<(), String>;
}
