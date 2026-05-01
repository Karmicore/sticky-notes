use std::sync::Arc;

use tauri::State;

use crate::app_core::note::Note;
use crate::app_core::service::NoteService;

#[tauri::command]
pub fn load_notes(svc: State<Arc<NoteService>>) -> Result<Vec<Note>, String> {
    svc.load_all()
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
pub fn get_next_id(svc: State<Arc<NoteService>>) -> i32 {
    svc.next_id()
}
