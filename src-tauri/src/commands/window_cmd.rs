use std::sync::Arc;

use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow};
use tauri::webview::WebviewWindowBuilder;
use tauri::Size;

use crate::app_core::note::Note;
use crate::app_core::service::NoteService;

// ── WindowConfig: single source of truth for window creation ──

struct WindowConfig {
    label: String,
    url: String,
    title: String,
    width: f64,
    height: f64,
    x: f64,
    y: f64,
    min_width: f64,
    min_height: f64,
    decorations: bool,
    resizable: bool,
    always_on_top: bool,
    skip_taskbar: bool,
    transparent: bool,
    focused: bool,
    visible: bool,
}

fn spawn_window(app: &AppHandle, cfg: WindowConfig) -> Result<(), String> {
    if app.get_webview_window(&cfg.label).is_some() {
        // Already exists — show and focus
        if let Some(w) = app.get_webview_window(&cfg.label) {
            w.show().ok();
            w.set_focus().ok();
        }
        return Ok(());
    }

    WebviewWindowBuilder::new(app, &cfg.label, tauri::WebviewUrl::App(cfg.url.into()))
        .title(&cfg.title)
        .inner_size(cfg.width, cfg.height)
        .position(cfg.x, cfg.y)
        .min_inner_size(cfg.min_width, cfg.min_height)
        .decorations(cfg.decorations)
        .resizable(cfg.resizable)
        .always_on_top(cfg.always_on_top)
        .skip_taskbar(cfg.skip_taskbar)
        .transparent(cfg.transparent)
        .focused(cfg.focused)
        .visible(cfg.visible)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

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
    spawn_window(app, WindowConfig {
        label: format!("note-{}", note.id),
        url: format!("note.html#color={}", note.color.trim_start_matches('#')),
        title: note.title.clone(),
        width: note.width as f64,
        height: note.height as f64,
        x: note.pos_x as f64,
        y: note.pos_y as f64,
        min_width: 180.0,
        min_height: 100.0,
        decorations: false,
        resizable: true,
        always_on_top: note.is_always_on_top,
        skip_taskbar: true,
        transparent: true,
        focused: false,
        visible: false,
    })
}

// ── Export popup window ──

pub fn spawn_export_window(
    app: &AppHandle,
    tray_rect: Option<&tauri::Rect>,
) -> Result<(), String> {
    let (w, h) = (320.0, 420.0);
    let (x, y) = match tray_rect.and_then(|r| Some(r.position)) {
        Some(tauri::Position::Logical(pos)) => {
            ((pos.x - w / 2.0).max(0.0), (pos.y - h - 8.0).max(0.0))
        }
        Some(tauri::Position::Physical(pos)) => {
            ((pos.x as f64 - w / 2.0).max(0.0), (pos.y as f64 - h - 8.0).max(0.0))
        }
        _ => (300.0, 200.0),
    };

    spawn_window(app, WindowConfig {
        label: "export".into(),
        url: "export.html".into(),
        title: "Export".into(),
        width: w,
        height: h,
        x,
        y,
        min_width: 280.0,
        min_height: 300.0,
        decorations: true,
        resizable: true,
        always_on_top: true,
        skip_taskbar: true,
        transparent: false,
        focused: true,
        visible: true,
    })
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
pub async fn open_export_window(app: AppHandle) -> Result<(), String> {
    spawn_export_window(&app, None)
}

// ── Share window ──

pub fn spawn_share_window(app: &AppHandle, text: &str, color: &str, x: f64, y: f64) -> Result<(), String> {
    let url = format!("share.html#text={}&color={}",
        urlencoding::encode(text),
        urlencoding::encode(color),
    );
    spawn_window(app, WindowConfig {
        label: "share".into(),
        url,
        title: "Share".into(),
        width: 640.0,
        height: 480.0,
        x,
        y,
        min_width: 400.0,
        min_height: 350.0,
        decorations: true,
        resizable: true,
        always_on_top: true,
        skip_taskbar: true,
        transparent: false,
        focused: true,
        visible: true,
    })
}

#[tauri::command]
pub async fn open_share_window(app: AppHandle, text: String, color: String, x: f64, y: f64) -> Result<(), String> {
    spawn_share_window(&app, &text, &color, x, y)
}
