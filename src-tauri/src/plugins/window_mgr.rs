use std::sync::Arc;

use tauri::{Manager, State, WebviewWindow};
use tauri::webview::WebviewWindowBuilder;

use crate::app_core::event::{EventBus, NoteEvent};
use crate::app_core::note::Note;
use crate::app_core::plugin::{Plugin, PluginContext};
use crate::app_core::repository::NoteRepository;

pub struct WindowManagerPlugin {
    ctx: Option<PluginContext>,
}

impl WindowManagerPlugin {
    pub fn new() -> Self {
        Self { ctx: None }
    }
}

// ── Tauri commands ──

#[tauri::command]
pub fn load_notes(repo: State<Arc<dyn NoteRepository>>) -> Result<Vec<Note>, String> {
    repo.load_all()
}

#[tauri::command]
pub fn get_note(id: i32, repo: State<Arc<dyn NoteRepository>>) -> Result<Note, String> {
    let notes = repo.load_all()?;
    notes.into_iter().find(|n| n.id == id).ok_or_else(|| format!("Note {} not found", id))
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

#[tauri::command]
pub async fn create_note_window(
    app: tauri::AppHandle,
    repo: State<'_, Arc<dyn NoteRepository>>,
    bus: State<'_, Arc<dyn EventBus>>,
) -> Result<Note, String> {
    let id = repo.next_id();
    let note = Note {
        id,
        title: format!("便签 {}", id + 1),
        ..Note::default()
    };
    repo.save(&note)?;
    bus.emit(NoteEvent::Created(note.clone()));
    spawn_note_window(&app, &note)?;
    Ok(note)
}

#[tauri::command]
pub async fn duplicate_note(
    app: tauri::AppHandle,
    source_id: i32,
    repo: State<'_, Arc<dyn NoteRepository>>,
    bus: State<'_, Arc<dyn EventBus>>,
) -> Result<Note, String> {
    let notes = repo.load_all()?;
    let source = notes.into_iter().find(|n| n.id == source_id)
        .ok_or_else(|| format!("Note {} not found", source_id))?;
    let new_id = repo.next_id();
    let new_note = Note {
        id: new_id,
        title: format!("{} (副本)", source.title),
        content: source.content,
        color: source.color,
        font_size: source.font_size,
        opacity: source.opacity,
        locked: false,
        ..Note::default()
    };
    repo.save(&new_note)?;
    bus.emit(NoteEvent::Created(new_note.clone()));
    spawn_note_window(&app, &new_note)?;
    Ok(new_note)
}

#[tauri::command]
pub async fn close_note_window(app: tauri::AppHandle, id: i32) -> Result<(), String> {
    let label = format!("note-{}", id);
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Spawn a Tauri window for a single note. Called on startup and when creating new notes.
pub fn spawn_note_window(app: &tauri::AppHandle, note: &Note) -> Result<(), String> {
    let label = format!("note-{}", note.id);
    // Skip if window already exists
    if app.get_webview_window(&label).is_some() {
        return Ok(());
    }

    let url = tauri::WebviewUrl::App("index.html".into());

    WebviewWindowBuilder::new(app, &label, url)
        .title(&note.title)
        .inner_size(note.width as f64, note.height as f64)
        .position(note.pos_x as f64, note.pos_y as f64)
        .min_inner_size(180.0, 100.0)
        .decorations(false)
        .resizable(true)
        .always_on_top(note.is_always_on_top)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
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
