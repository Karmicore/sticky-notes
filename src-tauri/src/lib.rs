use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, State, WebviewWindow,
};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: i32,
    pub title: String,
    pub content: String,
    pub color: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    #[serde(rename = "isAlwaysOnTop")]
    pub is_always_on_top: bool,
    #[serde(rename = "fontSize")]
    pub font_size: u32,
    pub opacity: f64,
    pub visible: bool,
}

impl Default for Note {
    fn default() -> Self {
        Self {
            id: 0,
            title: String::from("便签"),
            content: String::new(),
            color: String::from("#FFEB3B"),
            x: 100,
            y: 100,
            width: 260,
            height: 320,
            is_always_on_top: true,
            font_size: 14,
            opacity: 1.0,
            visible: true,
        }
    }
}

pub struct AppState {
    pub notes: Mutex<Vec<Note>>,
    pub next_id: Mutex<i32>,
}

fn get_data_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let data_dir = home.join(".stickynotes").join("notes");
    fs::create_dir_all(&data_dir).ok();
    data_dir
}

fn get_note_path(id: i32) -> PathBuf {
    get_data_dir().join(format!("note_{}.json", id))
}

#[tauri::command]
fn load_notes(state: State<AppState>) -> Result<Vec<Note>, String> {
    let data_dir = get_data_dir();
    let mut notes: Vec<Note> = Vec::new();
    let mut max_id = -1;

    if let Ok(entries) = fs::read_dir(&data_dir) {
        for entry in entries.flatten() {
            let filename = entry.file_name().to_string_lossy().to_string();
            if filename.starts_with("note_") && filename.ends_with(".json") {
                if let Ok(content) = fs::read_to_string(entry.path()) {
                    if let Ok(note) = serde_json::from_str::<Note>(&content) {
                        let id = note.id;
                        max_id = max_id.max(id);
                        notes.push(note);
                    }
                }
            }
        }
    }

    let next_id = max_id + 1;
    *state.notes.lock().unwrap() = notes.clone();
    *state.next_id.lock().unwrap() = next_id;

    Ok(notes)
}

#[tauri::command]
fn save_note(note: Note, state: State<AppState>) -> Result<(), String> {
    let path = get_note_path(note.id);
    let content = serde_json::to_string_pretty(&note).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;

    let mut notes = state.notes.lock().unwrap();
    if let Some(existing) = notes.iter_mut().find(|n| n.id == note.id) {
        *existing = note;
    } else {
        notes.push(note);
    }
    Ok(())
}

#[tauri::command]
fn delete_note(id: i32, state: State<AppState>) -> Result<(), String> {
    let path = get_note_path(id);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    let mut notes = state.notes.lock().unwrap();
    notes.retain(|n| n.id != id);
    Ok(())
}

#[tauri::command]
fn get_next_id(state: State<AppState>) -> i32 {
    let id = *state.next_id.lock().unwrap();
    *state.next_id.lock().unwrap() = id + 1;
    id
}

#[tauri::command]
fn set_window_always_on_top(window: WebviewWindow, on_top: bool) -> Result<(), String> {
    window.set_always_on_top(on_top).map_err(|e| e.to_string())
}

#[tauri::command]
fn hide_window(window: WebviewWindow) {
    window.hide().ok();
}

#[tauri::command]
fn show_window(window: WebviewWindow) {
    window.show().ok();
    window.set_focus().ok();
}

fn create_tray_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let show = MenuItem::with_id(app, "show", "显示全部", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "隐藏全部", true, None::<&str>)?;
    let new_note = MenuItem::with_id(app, "new", "新建便签", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    Menu::with_items(app, &[&show, &hide, &new_note, &quit])
}

pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(AppState {
            notes: Mutex::new(Vec::new()),
            next_id: Mutex::new(0),
        })
        .setup(|app| {
            let handle = app.handle().clone();

            let tray_menu = create_tray_menu(&handle)?;
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .menu_on_left_click(false)
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                window.show().ok();
                                window.set_focus().ok();
                            }
                            app.emit("show-all", ()).ok();
                        }
                        "hide" => {
                            app.emit("hide-all", ()).ok();
                        }
                        "new" => {
                            app.emit("create-note", ()).ok();
                        }
                        "quit" => {
                            app.emit("quit-app", ()).ok();
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().ok();
                            window.set_focus().ok();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_notes,
            save_note,
            delete_note,
            get_next_id,
            set_window_always_on_top,
            hide_window,
            show_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
