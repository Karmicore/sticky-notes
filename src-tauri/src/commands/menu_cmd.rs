use serde::Serialize;
use tauri::{Manager, WebviewWindow};
use tauri::webview::WebviewWindowBuilder;

use crate::app_core::note::Note;

/// Subset of Note fields needed by the menu UI.
/// Only these 6 fields are passed to the menu window to keep the payload small.
/// If a new menu command needs additional fields, add them here.
#[derive(Serialize)]
struct MenuNoteData {
    id: i32,
    title: String,
    color: String,
    is_always_on_top: bool,
    locked: bool,
    opacity: f64,
}

#[tauri::command]
pub fn open_context_menu(
    app: tauri::AppHandle,
    window: WebviewWindow,
    x: f64,
    y: f64,
    note_id: i32,
    note: Note,
) -> Result<(), String> {
    let label = format!("menu-{}", note_id);

    if let Some(old) = app.get_webview_window(&label) {
        old.close().ok();
    }

    let menu_data = MenuNoteData {
        id: note.id,
        title: note.title,
        color: note.color,
        is_always_on_top: note.is_always_on_top,
        locked: note.locked,
        opacity: note.opacity,
    };
    let note_json = serde_json::to_string(&menu_data).unwrap_or_default();
    let url = format!("menu.html#menu/{}/{}", note_id, note_json);

    WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::App(url.into()))
        .title("")
        .inner_size(220.0, 300.0)
        .position(x, y)
        .decorations(false)
        .resizable(false)
        .parent(&window).map_err(|e| e.to_string())?
        .skip_taskbar(true)
        .focused(true)
        .transparent(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}
