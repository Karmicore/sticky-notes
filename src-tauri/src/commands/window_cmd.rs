use std::sync::Arc;

use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow};
use tauri::webview::WebviewWindowBuilder;
use tauri::{LogicalPosition, Size};

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

pub fn any_collapsed(app: &AppHandle) -> bool {
    for (label, window) in app.webview_windows() {
        if !label.starts_with("note-") {
            continue;
        }
        if let Ok(size) = window.inner_size() {
            if size.height <= 30 {
                return true;
            }
        }
    }
    false
}

// ── Window spawning ──

pub fn spawn_note_window(app: &AppHandle, note: &Note) -> Result<(), String> {
    let label = format!("note-{}", note.id);
    if app.get_webview_window(&label).is_some() {
        return Ok(());
    }

    let url = format!("note.html#color={}", note.color.trim_start_matches('#'));
    WebviewWindowBuilder::new(app, &label, tauri::WebviewUrl::App(url.into()))
        .title(&note.title)
        .inner_size(note.width as f64, note.height as f64)
        .position(note.pos_x as f64, note.pos_y as f64)
        .min_inner_size(180.0, 100.0)
        .visible(false)
        .decorations(false)
        .resizable(true)
        .always_on_top(note.is_always_on_top)
        .skip_taskbar(true)
        .transparent(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ── Export popup window ──

pub fn spawn_export_window(
    app: &AppHandle,
    tray_rect: Option<&tauri::Rect>,
) -> Result<(), String> {
    let label = "export";
    if let Some(window) = app.get_webview_window(label) {
        window.show().ok();
        window.set_focus().ok();
        return Ok(());
    }

    let width = 320.0;
    let height = 420.0;

    // Try to position near the tray icon; fall back to center of screen
    let position = if let Some(rect) = tray_rect {
        match rect.position {
            tauri::Position::Logical(pos) => {
                let x = pos.x - width / 2.0;
                let y = pos.y - height - 8.0;
                LogicalPosition::new(x.max(0.0), y.max(0.0))
            }
            tauri::Position::Physical(pos) => {
                // Assume 1x scale for simplicity
                let x = pos.x as f64 - width / 2.0;
                let y = pos.y as f64 - height - 8.0;
                LogicalPosition::new(x.max(0.0), y.max(0.0))
            }
        }
    } else {
        // Fallback: center of screen
        LogicalPosition::new(300.0, 200.0)
    };

    WebviewWindowBuilder::new(app, label, tauri::WebviewUrl::App("export.html".into()))
        .title("Export")
        .inner_size(width, height)
        .position(position.x, position.y)
        .min_inner_size(280.0, 300.0)
        .decorations(true)
        .resizable(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .focused(true)
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

// ── Collapse / Expand all ──

pub fn collapse_all_note_windows(app: &AppHandle, svc: &NoteService) {
    for (label, window) in app.webview_windows() {
        if !label.starts_with("note-") {
            continue;
        }
        let id_str = &label[5..];
        let id: i32 = match id_str.parse() {
            Ok(v) => v,
            Err(_) => continue,
        };
        let mut note = match svc.get_note(id) {
            Ok(n) => n,
            Err(_) => continue,
        };
        if note.collapsed {
            continue;
        }
        let current = match window.inner_size() {
            Ok(s) => s,
            Err(_) => continue,
        };
        note.expanded_width = current.width;
        note.expanded_height = current.height;
        window
            .set_size(Size::Physical(tauri::PhysicalSize::new(
                current.width,
                COLLAPSED_HEIGHT,
            )))
            .ok();
        note.collapsed = true;
        note.width = note.expanded_width;
        note.height = COLLAPSED_HEIGHT;
        let collapsed = note.collapsed;
        svc.save_note(note).ok();
        window.emit("note-collapsed-changed", (id, collapsed)).ok();
    }
}

pub fn expand_all_note_windows(app: &AppHandle, svc: &NoteService) {
    for (label, window) in app.webview_windows() {
        if !label.starts_with("note-") {
            continue;
        }
        let id_str = &label[5..];
        let id: i32 = match id_str.parse() {
            Ok(v) => v,
            Err(_) => continue,
        };
        let mut note = match svc.get_note(id) {
            Ok(n) => n,
            Err(_) => continue,
        };
        if !note.collapsed {
            continue;
        }
        let w = note.expanded_width.max(180);
        let h = note.expanded_height.max(160);
        window
            .set_size(Size::Physical(tauri::PhysicalSize::new(w, h)))
            .ok();
        note.collapsed = false;
        note.width = w;
        note.height = h;
        let collapsed = note.collapsed;
        svc.save_note(note).ok();
        window.emit("note-collapsed-changed", (id, collapsed)).ok();
    }
}

#[tauri::command]
pub fn collapse_all_notes(
    app: AppHandle,
    svc: State<'_, Arc<NoteService>>,
) -> Result<(), String> {
    collapse_all_note_windows(&app, &svc);
    Ok(())
}

#[tauri::command]
pub fn expand_all_notes(
    app: AppHandle,
    svc: State<'_, Arc<NoteService>>,
) -> Result<(), String> {
    expand_all_note_windows(&app, &svc);
    Ok(())
}

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
        // Expand: restore saved dimensions
        let w = note.expanded_width.max(180);
        let h = note.expanded_height.max(160);
        window
            .set_size(Size::Physical(tauri::PhysicalSize::new(w, h)))
            .map_err(|e| e.to_string())?;
        note.collapsed = false;
        note.width = w;
        note.height = h;
    } else {
        // Collapse: save actual window dimensions, shrink to title bar
        let current = window.inner_size().map_err(|e| e.to_string())?;
        note.expanded_width = current.width;
        note.expanded_height = current.height;
        window
            .set_size(Size::Physical(tauri::PhysicalSize::new(
                current.width,
                COLLAPSED_HEIGHT,
            )))
            .map_err(|e| e.to_string())?;
        note.collapsed = true;
        note.width = current.width;
        note.height = COLLAPSED_HEIGHT;
    }

    svc.save_note(note.clone())?;
    window.emit("note-collapsed-changed", (note_id, note.collapsed)).ok();
    Ok(note)
}

#[tauri::command]
pub fn open_export_window(app: AppHandle) -> Result<(), String> {
    spawn_export_window(&app, None)
}
