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

    pub fn load_all(&self) -> Result<Vec<Note>, String> {
        self.repo.load_all()
    }

    pub fn load_all_visible(&self) -> Result<Vec<Note>, String> {
        Ok(self.repo.load_all()?.into_iter().filter(|n| n.visible).collect())
    }

    pub fn duplicate_note(&self, source_id: i32) -> Result<Note, String> {
        let source = self.get_note(source_id)?;
        let x = source.pos_x + 30;
        let y = source.pos_y + 30;
        let new_note = Note {
            id: self.alloc_id(),
            title: format!("{} (副本)", source.title),
            content: source.content,
            color: source.color,
            font_size: source.font_size,
            opacity: source.opacity,
            width: source.width,
            height: source.height,
            is_always_on_top: source.is_always_on_top,
            visible: source.visible,
            pos_x: x,
            pos_y: y,
            locked: false,
            collapsed: false,
            expanded_height: source.expanded_height,
            expanded_width: source.expanded_width,
        };
        self.repo.save(&new_note)?;
        Ok(new_note)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infra::sqlite_storage::SqliteStorage;

    fn make_service() -> NoteService {
        let repo: Arc<dyn NoteRepository> = Arc::new(SqliteStorage::new_memory());
        NoteService::new(repo)
    }

    #[test]
    fn create_note_assigns_incremental_ids() {
        let svc = make_service();
        let n1 = svc.create_note("A").unwrap();
        let n2 = svc.create_note("B").unwrap();
        let n3 = svc.create_note("C").unwrap();
        assert_eq!(n1.id, 0);
        assert_eq!(n2.id, 1);
        assert_eq!(n3.id, 2);
    }

    #[test]
    fn create_note_with_existing_data_continues_ids() {
        let repo: Arc<dyn NoteRepository> = Arc::new(SqliteStorage::new_memory());
        // Pre-seed with id=5
        let mut existing = Note::default();
        existing.id = 5;
        existing.title = "existing".into();
        repo.save(&existing).unwrap();

        let svc = NoteService::new(repo);
        let n = svc.create_note("new").unwrap();
        assert_eq!(n.id, 6);
    }

    #[test]
    fn create_note_position_increments() {
        let svc = make_service();
        let n1 = svc.create_note("A").unwrap();
        let n2 = svc.create_note("B").unwrap();
        assert!(n2.pos_x > n1.pos_x || n2.pos_y > n1.pos_y);
    }

    #[test]
    fn position_wraps_around_screen() {
        let svc = make_service();
        // Create many notes to trigger wrap
        for i in 0..60 {
            svc.create_note(&format!("N{}", i)).unwrap();
        }
        // After many notes, position should have wrapped back
        let notes = svc.repo.load_all().unwrap();
        let max_x = notes.iter().map(|n| n.pos_x).max().unwrap();
        assert!(max_x <= 1600, "pos_x wrapped: max_x = {}", max_x);
    }

    #[test]
    fn duplicate_note_copies_content() {
        let svc = make_service();
        let mut original = svc.create_note("Original").unwrap();
        original.content = "important text".into();
        original.color = "#BBDEFB".into();
        original.font_size = 20;
        svc.save_note(original).unwrap();

        let dup = svc.duplicate_note(0).unwrap();
        assert_eq!(dup.content, "important text");
        assert_eq!(dup.color, "#BBDEFB");
        assert_eq!(dup.font_size, 20);
        assert_eq!(dup.title, "Original (副本)");
        assert!(dup.pos_x > 100 || dup.pos_y > 100); // offset from original
    }

    #[test]
    fn duplicate_nonexistent_fails() {
        let svc = make_service();
        assert!(svc.duplicate_note(999).is_err());
    }

    #[test]
    fn delete_note_then_get_fails() {
        let svc = make_service();
        svc.create_note("A").unwrap();
        svc.delete_note(0).unwrap();
        assert!(svc.get_note(0).is_err());
    }

    #[test]
    fn load_all_visible_filters_hidden() {
        let svc = make_service();
        svc.create_note("visible").unwrap();
        let mut hidden = svc.create_note("hidden").unwrap();
        hidden.visible = false;
        svc.save_note(hidden).unwrap();

        let visible = svc.load_all_visible().unwrap();
        assert_eq!(visible.len(), 1);
        assert_eq!(visible[0].title, "visible");
    }

    #[test]
    fn duplicate_resets_locked_and_collapsed() {
        let svc = make_service();
        let mut original = svc.create_note("orig").unwrap();
        original.locked = true;
        original.collapsed = true;
        svc.save_note(original).unwrap();

        let dup = svc.duplicate_note(0).unwrap();
        assert!(!dup.locked);
        assert!(!dup.collapsed);
    }

    #[test]
    fn save_then_load_preserves_all_fields() {
        let svc = make_service();
        let mut note = svc.create_note("test").unwrap();
        note.content = "important data".into();
        note.color = "#BBDEFB".into();
        note.font_size = 20;
        note.opacity = 0.5;
        note.locked = true;
        note.collapsed = true;
        note.expanded_width = 300;
        note.expanded_height = 400;
        svc.save_note(note).unwrap();

        let loaded = svc.get_note(0).unwrap();
        assert_eq!(loaded.content, "important data");
        assert_eq!(loaded.color, "#BBDEFB");
        assert_eq!(loaded.font_size, 20);
        assert!((loaded.opacity - 0.5).abs() < f64::EPSILON);
        assert!(loaded.locked);
        assert!(loaded.collapsed);
        assert_eq!(loaded.expanded_width, 300);
        assert_eq!(loaded.expanded_height, 400);
    }

    #[test]
    fn edit_content_does_not_affect_other_notes() {
        let svc = make_service();
        svc.create_note("A").unwrap();
        let mut b = svc.create_note("B").unwrap();
        b.content = "B's content".into();
        svc.save_note(b).unwrap();

        let a = svc.get_note(0).unwrap();
        assert_eq!(a.title, "A");
        assert_eq!(a.content, "");
    }

    #[test]
    fn create_note_default_dimensions() {
        let svc = make_service();
        let note = svc.create_note("new").unwrap();
        assert_eq!(note.width, 260);
        assert_eq!(note.height, 320);
        assert_eq!(note.expanded_width, 260);
        assert_eq!(note.expanded_height, 240);
        assert!(!note.collapsed);
    }
}
