use super::note::Note;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub enum NoteEvent {
    Created(Note),
    Updated(Note),
    Deleted(i32),
    ShowAll,
    HideAll,
    Quit,
}

pub trait EventBus: Send + Sync {
    fn emit(&self, event: NoteEvent);
    fn subscribe(&self, handler: Box<dyn Fn(&NoteEvent) + Send + Sync>);
}
