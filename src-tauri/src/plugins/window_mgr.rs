use std::sync::Arc;

use tauri::{Manager, State, WebviewWindow};

use crate::core::event::{EventBus, NoteEvent};
use crate::core::note::Note;
use crate::core::plugin::{Plugin, PluginContext};
use crate::core::repository::NoteRepository;

pub struct WindowManagerPlugin {
    ctx: Option<PluginContext>,
}

impl WindowManagerPlugin {
    pub fn new() -> Self {
        Self { ctx: None }
    }
}

// Tauri commands — these are the bridge from frontend invoke() to our architecture

#[tauri::command]
pub fn load_notes(repo: State<Arc<dyn NoteRepository>>) -> Result<Vec<Note>, String> {
    repo.load_all()
}

#[tauri::command]
pub fn save_note(
    note: Note,
    repo: State<Arc<dyn NoteRepository>>,
    bus: State<Arc<dyn EventBus>>,
) -> Result<(), String> {
    repo.save(&note)?;
    bus.emit(NoteEvent::Updated(note));
    Ok(())
}

#[tauri::command]
pub fn delete_note(
    id: i32,
    repo: State<Arc<dyn NoteRepository>>,
    bus: State<Arc<dyn EventBus>>,
) -> Result<(), String> {
    repo.delete(id)?;
    bus.emit(NoteEvent::Deleted(id));
    Ok(())
}

#[tauri::command]
pub fn get_next_id(repo: State<Arc<dyn NoteRepository>>) -> i32 {
    repo.next_id()
}

#[tauri::command]
pub fn set_window_always_on_top(window: WebviewWindow, on_top: bool) -> Result<(), String> {
    window.set_always_on_top(on_top).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn hide_window(window: WebviewWindow) {
    window.hide().ok();
}

#[tauri::command]
pub fn show_window(window: WebviewWindow) {
    window.show().ok();
    window.set_focus().ok();
}

impl Plugin for WindowManagerPlugin {
    fn name(&self) -> &str {
        "window-manager"
    }

    fn init(&mut self, ctx: &mut PluginContext) -> Result<(), String> {
        self.ctx = Some(PluginContext {
            event_bus: ctx.event_bus.clone(),
            repository: ctx.repository.clone(),
            app_handle: None,
        });
        Ok(())
    }

    fn on_event(&self, event: &NoteEvent) {
        let ctx = match &self.ctx {
            Some(c) => c,
            None => return,
        };
        let app = match &ctx.app_handle {
            Some(h) => h,
            None => return,
        };

        match event {
            NoteEvent::ShowAll => {
                if let Some(window) = app.get_webview_window("main") {
                    window.show().ok();
                    window.set_focus().ok();
                }
            }
            NoteEvent::HideAll => {
                if let Some(window) = app.get_webview_window("main") {
                    window.hide().ok();
                }
            }
            _ => {}
        }
    }
}
