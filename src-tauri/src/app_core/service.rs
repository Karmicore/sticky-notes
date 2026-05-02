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

    fn next_position(&self) -> (i32, i32) {
        let notes = self.repo.load_all().unwrap_or_default();
        let max_x = notes.iter().map(|n| n.pos_x).max().unwrap_or(70);
        let max_y = notes.iter().map(|n| n.pos_y).max().unwrap_or(70);
        let x = if max_x + 30 > 1600 { 100 } else { max_x + 30 };
        let y = if max_y + 30 > 900 { 100 } else { max_y + 30 };
        (x, y)
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
        let (x, y) = self.next_position();
        let note = Note {
            id,
            title: title.to_string(),
            pos_x: x,
            pos_y: y,
            ..Note::default()
        };
        self.repo.save(&note)?;
        Ok(note)
    }

    pub fn duplicate_note(&self, source_id: i32) -> Result<Note, String> {
        let source = self.get_note(source_id)?;
        let (x, y) = self.next_position();
        let new_note = Note {
            id: self.alloc_id(),
            title: format!("{} (副本)", source.title),
            content: source.content,
            color: source.color,
            font_size: source.font_size,
            opacity: source.opacity,
            pos_x: x,
            pos_y: y,
            locked: false,
            ..Note::default()
        };
        self.repo.save(&new_note)?;
        Ok(new_note)
    }
}
