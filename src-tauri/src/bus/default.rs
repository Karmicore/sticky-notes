use std::sync::Mutex;

use crate::app_core::event::{EventBus, NoteEvent};

type Handler = Box<dyn Fn(&NoteEvent) + Send + Sync>;

pub struct DefaultEventBus {
    handlers: Mutex<Vec<Handler>>,
}

impl DefaultEventBus {
    pub fn new() -> Self {
        Self {
            handlers: Mutex::new(Vec::new()),
        }
    }
}

impl EventBus for DefaultEventBus {
    fn emit(&self, event: NoteEvent) {
        let handlers = self.handlers.lock().unwrap();
        for handler in handlers.iter() {
            handler(&event);
        }
    }

    fn subscribe(&self, handler: Handler) {
        let mut handlers = self.handlers.lock().unwrap();
        handlers.push(handler);
    }
}
