use crate::app_core::event::{EventBus, NoteEvent};

pub struct DefaultEventBus;

impl DefaultEventBus {
    pub fn new() -> Self {
        Self
    }
}

impl EventBus for DefaultEventBus {
    fn emit(&self, _event: NoteEvent) {
        // No subscribers yet — events are emitted for future extensibility
    }
}
