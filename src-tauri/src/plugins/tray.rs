use std::sync::{Arc, Mutex};

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

use crate::app_core::service::NoteService;
use crate::commands::{config_cmd, export_cmd, window_cmd};

/// Wrapper to store the TrayIcon handle in app state for menu rebuilding.
pub struct TrayHandle(pub Mutex<TrayIcon>);

fn is_chinese() -> bool {
    sys_locale::get_locale()
        .map(|l| l.to_lowercase().starts_with("zh"))
        .unwrap_or(false)
}

fn t(zh: &str, en: &str) -> String {
    if is_chinese() {
        zh.to_string()
    } else {
        en.to_string()
    }
}

pub struct TrayPlugin;

impl TrayPlugin {
    pub fn new() -> Self {
        Self
    }

    /// Build the export submenu with inline note list and toggle marks.
    fn build_export_submenu(app: &AppHandle, svc: &NoteService) -> Result<Submenu<tauri::Wry>, String> {
        let selected = config_cmd::load_export_selected_ids();
        let notes = svc.load_all().unwrap_or_default();

        let mut items: Vec<Box<dyn tauri::menu::IsMenuItem<tauri::Wry>>> = Vec::new();

        for note in &notes {
            let mark = if selected.contains(&note.id) { "✓ " } else { "  " };
            let label = format!("{}{}", mark, note.title);
            let item = MenuItem::with_id(
                app,
                format!("toggle_{}", note.id),
                label,
                true,
                None::<&str>,
            )
            .map_err(|e| e.to_string())?;
            items.push(Box::new(item));
        }

        if !notes.is_empty() {
            items.push(Box::new(PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?));
        }

        let export_copy = MenuItem::with_id(
            app,
            "export_copy",
            t("复制式导出", "Copy Export"),
            selected.is_empty(),
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
        let export_cut = MenuItem::with_id(
            app,
            "export_cut",
            t("剪切式导出", "Cut Export"),
            selected.is_empty(),
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
        items.push(Box::new(export_copy));
        items.push(Box::new(export_cut));

        let refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> = items.iter().map(|b| b.as_ref()).collect();
        Submenu::with_items(app, t("导出", "Export"), true, &refs)
            .map_err(|e| e.to_string())
    }

    /// Rebuild the entire tray menu and apply it to the stored TrayIcon handle.
    fn rebuild_tray_menu(app: &AppHandle, svc: &NoteService) {
        let show = match MenuItem::with_id(app, "show", t("显示全部", "Show All"), true, Some("Alt+S")) {
            Ok(v) => v,
            Err(_) => return,
        };
        let hide = match MenuItem::with_id(app, "hide", t("隐藏全部", "Hide All"), true, Some("Alt+H")) {
            Ok(v) => v,
            Err(_) => return,
        };
        let new_note = match MenuItem::with_id(app, "new", t("新建便签", "New Note"), true, Some("Alt+N")) {
            Ok(v) => v,
            Err(_) => return,
        };
        let quit = match MenuItem::with_id(app, "quit", t("退出", "Quit"), true, None::<&str>) {
            Ok(v) => v,
            Err(_) => return,
        };

        let export_menu = match Self::build_export_submenu(app, svc) {
            Ok(v) => v,
            Err(_) => return,
        };

        let menu = match Menu::with_items(app, &[&show, &hide, &new_note, &export_menu, &quit]) {
            Ok(v) => v,
            Err(_) => return,
        };

        if let Some(tray_handle) = app.try_state::<TrayHandle>() {
            if let Ok(tray) = tray_handle.0.lock() {
                tray.set_menu(Some(menu)).ok();
            }
        }
    }

    pub fn build(&self, app: &AppHandle) -> Result<(), String> {
        let svc = app
            .try_state::<Arc<NoteService>>()
            .ok_or("NoteService not found")?;

        let export_menu = Self::build_export_submenu(app, &svc)?;

        let show = MenuItem::with_id(app, "show", t("显示全部", "Show All"), true, Some("Alt+S"))
            .map_err(|e| e.to_string())?;
        let hide = MenuItem::with_id(app, "hide", t("隐藏全部", "Hide All"), true, Some("Alt+H"))
            .map_err(|e| e.to_string())?;
        let new_note =
            MenuItem::with_id(app, "new", t("新建便签", "New Note"), true, Some("Alt+N"))
                .map_err(|e| e.to_string())?;
        let quit = MenuItem::with_id(app, "quit", t("退出", "Quit"), true, None::<&str>)
            .map_err(|e| e.to_string())?;

        let tray_menu = Menu::with_items(
            app,
            &[&show, &hide, &new_note, &export_menu, &quit],
        )
        .map_err(|e| e.to_string())?;

        let tray = TrayIconBuilder::new()
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&tray_menu)
            .show_menu_on_left_click(false)
            .on_menu_event(move |app, event| {
                let id = event.id.as_ref();

                match id {
                    "show" => window_cmd::show_all_note_windows(app),
                    "hide" => window_cmd::hide_all_note_windows(app),
                    "new" => {
                        if let Some(svc) = app.try_state::<Arc<NoteService>>() {
                            if let Ok(note) = svc.create_note(&t("便签", "Note")) {
                                window_cmd::spawn_note_window(app, &note).ok();
                            }
                        }
                    }
                    "export_copy" => {
                        if let Some(svc) = app.try_state::<Arc<NoteService>>() {
                            let ids = config_cmd::load_export_selected_ids();
                            if !ids.is_empty() {
                                export_cmd::do_export_copy(&ids, app, &svc).ok();
                            }
                        }
                    }
                    "export_cut" => {
                        if let Some(svc) = app.try_state::<Arc<NoteService>>() {
                            let ids = config_cmd::load_export_selected_ids();
                            if !ids.is_empty() {
                                if export_cmd::do_export_cut(&ids, app, &svc).is_ok() {
                                    // Menu needs rebuild after cut (titles may have changed)
                                    Self::rebuild_tray_menu(app, &svc);
                                }
                            }
                        }
                    }
                    "quit" => {
                        app.emit("quit-app", ()).ok();
                    }
                    _ if id.starts_with("toggle_") => {
                        if let Some(id_str) = id.strip_prefix("toggle_") {
                            if let Ok(note_id) = id_str.parse::<i32>() {
                                let mut selected = config_cmd::load_export_selected_ids();
                                if selected.contains(&note_id) {
                                    selected.retain(|&x| x != note_id);
                                } else {
                                    selected.push(note_id);
                                }
                                config_cmd::save_export_selected_ids(&selected).ok();
                                if let Some(svc) = app.try_state::<Arc<NoteService>>() {
                                    Self::rebuild_tray_menu(app, &svc);
                                }
                            }
                        }
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
                    window_cmd::show_all_note_windows(tray.app_handle());
                }
            })
            .build(app)
            .map_err(|e| e.to_string())?;

        // Store the TrayIcon handle for menu rebuilding
        app.manage(TrayHandle(Mutex::new(tray)));

        Ok(())
    }
}
