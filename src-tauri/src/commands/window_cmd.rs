use std::sync::Arc;

use tauri::{Manager, State, WebviewWindow};
use tauri::webview::WebviewWindowBuilder;

use crate::app_core::note::Note;
use crate::app_core::service::NoteService;

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
    svc: State<'_, Arc<NoteService>>,
) -> Result<Note, String> {
    let note = svc.create_note("便签")?;
    spawn_note_window(&app, &note)?;
    Ok(note)
}

#[tauri::command]
pub async fn duplicate_note(
    app: tauri::AppHandle,
    source_id: i32,
    svc: State<'_, Arc<NoteService>>,
) -> Result<Note, String> {
    let note = svc.duplicate_note(source_id)?;
    spawn_note_window(&app, &note)?;
    Ok(note)
}

#[tauri::command]
pub async fn close_note_window(app: tauri::AppHandle, id: i32) -> Result<(), String> {
    let label = format!("note-{}", id);
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn show_all_notes(app: tauri::AppHandle) -> Result<(), String> {
    for (label, window) in app.webview_windows() {
        if label.starts_with("note-") {
            window.show().ok();
            window.set_focus().ok();
        }
    }
    Ok(())
}

#[tauri::command]
pub fn hide_all_notes(app: tauri::AppHandle) -> Result<(), String> {
    for (label, window) in app.webview_windows() {
        if label.starts_with("note-") {
            window.hide().ok();
        }
    }
    Ok(())
}

#[tauri::command]
pub fn open_context_menu(app: tauri::AppHandle, x: f64, y: f64, note_id: i32, note: Note) -> Result<(), String> {
    let label = format!("menu-{}", note_id);

    if let Some(old) = app.get_webview_window(&label) {
        old.close().ok();
    }

    let note_json = serde_json::to_string(&note).unwrap_or_default();
    let url = format!("index.html#menu/{}/{}", note_id, note_json);

    WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::App(url.into()))
        .title("")
        .inner_size(220.0, 300.0)
        .position(x, y)
        .decorations(false)
        .resizable(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .focused(true)
        .transparent(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn spawn_note_window(app: &tauri::AppHandle, note: &Note) -> Result<(), String> {
    let label = format!("note-{}", note.id);
    if app.get_webview_window(&label).is_some() {
        return Ok(());
    }

    WebviewWindowBuilder::new(app, &label, tauri::WebviewUrl::App("index.html".into()))
        .title(&note.title)
        .inner_size(note.width as f64, note.height as f64)
        .position(note.pos_x as f64, note.pos_y as f64)
        .min_inner_size(180.0, 100.0)
        .decorations(false)
        .resizable(true)
        .always_on_top(note.is_always_on_top)
        .skip_taskbar(true)
        .transparent(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}
