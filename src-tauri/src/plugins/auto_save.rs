use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use crate::core::event::NoteEvent;
use crate::core::note::Note;
use crate::core::plugin::{Plugin, PluginContext};
use crate::core::repository::NoteRepository;

const DEBOUNCE_MS: u128 = 800;

pub struct AutoSavePlugin {
    repository: Option<Arc<dyn NoteRepository>>,
    pending: Mutex<HashMap<i32, (Note, Instant)>>,
}

impl AutoSavePlugin {
    pub fn new() -> Self {
        Self {
            repository: None,
            pending: Mutex::new(HashMap::new()),
        }
    }

    fn flush_pending(&self) {
        let repo = match &self.repository {
            Some(r) => r,
            None => return,
        };

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
            repo.save(&note).ok();
        }
    }
}

impl Plugin for AutoSavePlugin {
    fn name(&self) -> &str {
        "auto-save"
    }

    fn init(&mut self, ctx: &mut PluginContext) -> Result<(), String> {
        self.repository = Some(ctx.repository.clone());
        Ok(())
    }

    fn on_event(&self, event: &NoteEvent) {
        match event {
            NoteEvent::Updated(note) => {
                let mut pending = self.pending.lock().unwrap();
                pending.insert(note.id, (note.clone(), Instant::now()));
                drop(pending);
                self.flush_pending();
            }
            _ => {}
        }
    }
}
