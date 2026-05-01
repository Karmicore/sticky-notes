use std::sync::Arc;

use tauri::{Manager, State};

use crate::app_core::note::Note;
use crate::app_core::service::NoteService;
use crate::commands::window_factory;

#[tauri::command]
pub async fn create_note_window(
    app: tauri::AppHandle,
    svc: State<'_, Arc<NoteService>>,
) -> Result<Note, String> {
    let note = svc.create_note("便签")?;
    window_factory::spawn_note_window(&app, &note)?;
    Ok(note)
}

#[tauri::command]
pub async fn duplicate_note(
    app: tauri::AppHandle,
    source_id: i32,
    svc: State<'_, Arc<NoteService>>,
) -> Result<Note, String> {
    let note = svc.duplicate_note(source_id)?;
    window_factory::spawn_note_window(&app, &note)?;
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
