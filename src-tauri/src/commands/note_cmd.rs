use std::sync::Arc;

use tauri::{AppHandle, Manager, State};

use crate::app_core::note::Note;
use crate::app_core::service::NoteService;
use crate::commands::window_cmd::spawn_note_window;

#[tauri::command]
pub fn get_note(id: i32, svc: State<Arc<NoteService>>) -> Result<Note, String> {
    svc.get_note(id)
}

#[tauri::command]
pub fn save_note(note: Note, svc: State<Arc<NoteService>>) -> Result<(), String> {
    svc.save_note(note)
}

#[tauri::command]
pub fn delete_note(id: i32, svc: State<Arc<NoteService>>) -> Result<(), String> {
    svc.delete_note(id)
}

#[tauri::command]
pub async fn create_note_window(
    app: AppHandle,
    svc: State<'_, Arc<NoteService>>,
) -> Result<Note, String> {
    let note = svc.create_note("便签")?;
    spawn_note_window(&app, &note)?;
    Ok(note)
}

#[tauri::command]
pub async fn duplicate_note(
    app: AppHandle,
    source_id: i32,
    svc: State<'_, Arc<NoteService>>,
) -> Result<Note, String> {
    let note = svc.duplicate_note(source_id)?;
    spawn_note_window(&app, &note)?;
    Ok(note)
}

#[tauri::command]
pub async fn close_note_window(app: AppHandle, id: i32) -> Result<(), String> {
    let label = format!("note-{}", id);
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}
