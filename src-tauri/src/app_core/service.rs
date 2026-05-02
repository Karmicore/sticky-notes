use std::sync::Arc;
use std::sync::atomic::{AtomicI32, Ordering};

use super::note::Note;
use super::repository::NoteRepository;

pub struct NoteService {
    repo: Arc<dyn NoteRepository>,
    next_id: AtomicI32,
}

impl NoteService {
    pub fn new(repo: Arc<dyn NoteRepository>) -> Self {
        let max_id = repo
            .load_all()
            .unwrap_or_default()
            .iter()
            .map(|n| n.id)
            .max()
            .unwrap_or(-1);
        Self {
            repo,
            next_id: AtomicI32::new(max_id + 1),
        }
    }

    fn alloc_id(&self) -> i32 {
        self.next_id.fetch_add(1, Ordering::SeqCst)
    }

    pub fn get_note(&self, id: i32) -> Result<Note, String> {
        self.repo.load(id)
    }

    pub fn save_note(&self, note: Note) -> Result<(), String> {
        self.repo.save(&note)
    }

    pub fn delete_note(&self, id: i32) -> Result<(), String> {
        self.repo.delete(id)
    }

    pub fn create_note(&self, title: &str) -> Result<Note, String> {
        let id = self.alloc_id();
        let note = Note {
            id,
            title: title.to_string(),
            ..Note::default()
        };
        self.repo.save(&note)?;
        Ok(note)
    }

    pub fn duplicate_note(&self, source_id: i32) -> Result<Note, String> {
        let source = self.get_note(source_id)?;
        let new_note = Note {
            id: self.alloc_id(),
            title: format!("{} (副本)", source.title),
            content: source.content,
            color: source.color,
            font_size: source.font_size,
            opacity: source.opacity,
            locked: false,
            ..Note::default()
        };
        self.repo.save(&new_note)?;
        Ok(new_note)
    }
}
