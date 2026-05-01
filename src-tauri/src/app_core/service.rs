use std::sync::Arc;

use super::event::{EventBus, NoteEvent};
use super::note::Note;
use super::repository::NoteRepository;

pub struct NoteService {
    repo: Arc<dyn NoteRepository>,
    bus: Arc<dyn EventBus>,
}

impl NoteService {
    pub fn new(repo: Arc<dyn NoteRepository>, bus: Arc<dyn EventBus>) -> Self {
        Self { repo, bus }
    }

    pub fn get_note(&self, id: i32) -> Result<Note, String> {
        self.repo
            .load_all()?
            .into_iter()
            .find(|n| n.id == id)
            .ok_or_else(|| format!("Note {} not found", id))
    }

    pub fn load_all(&self) -> Result<Vec<Note>, String> {
        self.repo.load_all()
    }

    pub fn save_note(&self, note: Note) -> Result<(), String> {
        self.repo.save(&note)?;
        self.bus.emit(NoteEvent::Updated(note));
        Ok(())
    }

    pub fn delete_note(&self, id: i32) -> Result<(), String> {
        self.repo.delete(id)?;
        self.bus.emit(NoteEvent::Deleted(id));
        Ok(())
    }

    pub fn create_note(&self, title: &str) -> Result<Note, String> {
        let id = self.repo.next_id();
        let note = Note {
            id,
            title: title.to_string(),
            ..Note::default()
        };
        self.repo.save(&note)?;
        self.bus.emit(NoteEvent::Created(note.clone()));
        Ok(note)
    }

    pub fn duplicate_note(&self, source_id: i32) -> Result<Note, String> {
        let source = self.get_note(source_id)?;
        let new_note = Note {
            id: self.repo.next_id(),
            title: format!("{} (副本)", source.title),
            content: source.content,
            color: source.color,
            font_size: source.font_size,
            opacity: source.opacity,
            locked: false,
            ..Note::default()
        };
        self.repo.save(&new_note)?;
        self.bus.emit(NoteEvent::Created(new_note.clone()));
        Ok(new_note)
    }

    pub fn next_id(&self) -> i32 {
        self.repo.next_id()
    }
}
