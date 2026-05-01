use tauri::Manager;
use tauri::webview::WebviewWindowBuilder;

use crate::app_core::note::Note;

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
