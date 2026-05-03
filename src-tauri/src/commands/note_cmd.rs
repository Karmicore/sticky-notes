use std::sync::Arc;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::app_core::note::Note;
use crate::app_core::service::NoteService;
use crate::commands::window_cmd::spawn_note_window;

#[derive(Serialize)]
pub struct NoteRect {
    pub id: i32,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

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
    let app2 = app.clone();
    let note2 = note.clone();
    tauri::async_runtime::spawn_blocking(move || {
        spawn_note_window(&app2, &note2).ok();
    });
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

#[tauri::command]
pub fn load_all_notes(svc: State<Arc<NoteService>>) -> Result<Vec<Note>, String> {
    svc.load_all()
}

#[tauri::command]
pub fn get_all_notes_rect(
    exclude_id: i32,
    svc: State<Arc<NoteService>>,
) -> Result<Vec<NoteRect>, String> {
    let notes = svc.load_all_visible()?;
    Ok(notes
        .into_iter()
        .filter(|n| n.id != exclude_id && !n.collapsed)
        .map(|n| NoteRect {
            id: n.id,
            x: n.pos_x,
            y: n.pos_y,
            width: n.width,
            height: n.height,
        })
        .collect())
}
