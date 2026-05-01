use tauri::{Manager, WebviewWindow};

#[tauri::command]
pub fn set_window_always_on_top(window: WebviewWindow, on_top: bool) -> Result<(), String> {
    window.set_always_on_top(on_top).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn hide_window(window: WebviewWindow) {
    window.hide().ok();
}

#[tauri::command]
pub fn show_window(window: WebviewWindow) {
    window.show().ok();
    window.set_focus().ok();
}

#[tauri::command]
pub fn show_all_notes(app: tauri::AppHandle) -> Result<(), String> {
    for (label, window) in app.webview_windows() {
        if label.starts_with("note-") {
            window.show().ok();
            window.set_focus().ok();
        }
    }
    Ok(())
}

#[tauri::command]
pub fn hide_all_notes(app: tauri::AppHandle) -> Result<(), String> {
    for (label, window) in app.webview_windows() {
        if label.starts_with("note-") {
            window.hide().ok();
        }
    }
    Ok(())
}
