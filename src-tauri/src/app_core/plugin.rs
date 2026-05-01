use std::sync::Arc;

use super::event::EventBus;
use super::event::NoteEvent;
use super::repository::NoteRepository;

pub trait Plugin: Send + Sync {
    fn name(&self) -> &str;
    fn init(&mut self, ctx: &mut PluginContext) -> Result<(), String>;
    fn on_event(&self, _event: &NoteEvent) {}
    fn shutdown(&self) {}
}

pub struct PluginContext {
    pub event_bus: Arc<dyn EventBus>,
    pub repository: Arc<dyn NoteRepository>,
    pub app_handle: Option<tauri::AppHandle>,
}
