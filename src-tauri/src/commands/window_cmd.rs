use tauri::{AppHandle, Manager, WebviewWindow};
use tauri::webview::WebviewWindowBuilder;

use crate::app_core::note::Note;

// ── Shared helpers (used by both commands and tray) ──

pub fn show_all_note_windows(app: &AppHandle) {
    for (label, window) in app.webview_windows() {
        if label.starts_with("note-") {
            println!("[show_all] showing {}", label);
            if let Err(e) = window.show() {
                eprintln!("[show_all] show {} error: {}", label, e);
            }
            if let Err(e) = window.set_focus() {
                eprintln!("[show_all] focus {} error: {}", label, e);
            }
        }
    }
}

pub fn hide_all_note_windows(app: &AppHandle) {
    for (label, window) in app.webview_windows() {
        if label.starts_with("note-") {
            window.hide().ok();
        }
    }
}

// ── Window spawning ──

pub fn spawn_note_window(app: &AppHandle, note: &Note) -> Result<(), String> {
    let label = format!("note-{}", note.id);
    if app.get_webview_window(&label).is_some() {
        return Ok(());
    }

    WebviewWindowBuilder::new(app, &label, tauri::WebviewUrl::App("note.html".into()))
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

// ── Tauri commands ──

#[tauri::command]
pub fn set_window_always_on_top(window: WebviewWindow, on_top: bool) -> Result<(), String> {
    window.set_always_on_top(on_top).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn show_all_notes(app: AppHandle) -> Result<(), String> {
    show_all_note_windows(&app);
    Ok(())
}

#[tauri::command]
pub fn hide_all_notes(app: AppHandle) -> Result<(), String> {
    hide_all_note_windows(&app);
    Ok(())
}
