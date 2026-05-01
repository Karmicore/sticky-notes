use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use crate::app_core::event::{EventBus, NoteEvent};
use crate::app_core::note::Note;
use crate::app_core::repository::NoteRepository;

const DEBOUNCE_MS: u128 = 800;

pub struct AutoSaveService {
    repository: Arc<dyn NoteRepository>,
    pending: Mutex<HashMap<i32, (Note, Instant)>>,
}

impl AutoSaveService {
    /// Create and subscribe to the event bus. Returns Arc<Self> for use in event handler.
    pub fn subscribe(bus: &dyn EventBus, repository: Arc<dyn NoteRepository>) -> Arc<Self> {
        let svc = Arc::new(Self {
            repository,
            pending: Mutex::new(HashMap::new()),
        });
        let svc_clone = svc.clone();
        bus.subscribe(Box::new(move |event| {
            if let NoteEvent::Updated(note) = event {
                svc_clone.on_updated(note);
            }
        }));
        svc
    }

    fn on_updated(&self, note: &Note) {
        {
            let mut pending = self.pending.lock().unwrap();
            pending.insert(note.id, (note.clone(), Instant::now()));
        }
        self.flush_pending();
    }

    fn flush_pending(&self) {
        let mut pending = self.pending.lock().unwrap();
        let now = Instant::now();
        let mut to_save = Vec::new();

        pending.retain(|_id, (note, last_update)| {
            if now.duration_since(*last_update).as_millis() >= DEBOUNCE_MS {
                to_save.push(note.clone());
                false
            } else {
                true
            }
        });

        drop(pending);

        for note in to_save {
            self.repository.save(&note).ok();
        }
    }
}
