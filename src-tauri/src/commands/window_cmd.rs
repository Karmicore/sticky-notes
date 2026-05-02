use std::sync::Arc;

use tauri::{AppHandle, Manager, State, WebviewWindow};
use tauri::webview::WebviewWindowBuilder;
use tauri::Size;

use crate::app_core::note::Note;
use crate::app_core::service::NoteService;

// ── Shared helpers (used by both commands and tray) ──

pub fn show_all_note_windows(app: &AppHandle) {
    for (label, window) in app.webview_windows() {
        if label.starts_with("note-") {
            window.show().ok();
            window.set_focus().ok();
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

const COLLAPSED_HEIGHT: u32 = 28;

#[tauri::command]
pub fn toggle_note_collapsed(
    app: AppHandle,
    note_id: i32,
    svc: State<'_, Arc<NoteService>>,
) -> Result<Note, String> {
    let mut note = svc.get_note(note_id)?;
    let label = format!("note-{}", note_id);
    let window = app
        .get_webview_window(&label)
        .ok_or_else(|| format!("window {} not found", label))?;

    if note.collapsed {
        // Expand: restore saved height
        let h = note.expanded_height.max(160);
        window
            .set_size(Size::Physical(tauri::PhysicalSize::new(note.width, h)))
            .map_err(|e| e.to_string())?;
        note.collapsed = false;
        note.height = h;
    } else {
        // Collapse: save current window height, shrink to title bar
        let current = window.inner_size().map_err(|e| e.to_string())?;
        note.expanded_height = current.height.max(160);
        window
            .set_size(Size::Physical(tauri::PhysicalSize::new(
                note.width,
                COLLAPSED_HEIGHT,
            )))
            .map_err(|e| e.to_string())?;
        note.collapsed = true;
        note.height = COLLAPSED_HEIGHT;
    }

    svc.save_note(note.clone())?;
    Ok(note)
}
