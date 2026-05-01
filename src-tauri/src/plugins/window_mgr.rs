use tauri::Manager;

use crate::app_core::event::NoteEvent;
use crate::app_core::plugin::{Plugin, PluginContext};

/// Handles ShowAll/HideAll events by toggling note windows.
pub struct WindowManagerPlugin {
    ctx: Option<PluginContext>,
}

impl WindowManagerPlugin {
    pub fn new() -> Self {
        Self { ctx: None }
    }
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
                for (label, window) in app.webview_windows() {
                    if label.starts_with("note-") {
                        window.show().ok();
                        window.set_focus().ok();
                    }
                }
            }
            NoteEvent::HideAll => {
                for (label, window) in app.webview_windows() {
                    if label.starts_with("note-") {
                        window.hide().ok();
                    }
                }
            }
            _ => {}
        }
    }
}
