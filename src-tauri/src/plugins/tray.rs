use std::sync::{Arc, Mutex};

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

use crate::app_core::service::NoteService;
use crate::commands::window_cmd;

/// Wrapper to store the TrayIcon handle in app state for window positioning.
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

    pub fn build(&self, app: &AppHandle) -> Result<(), String> {
        let show = MenuItem::with_id(app, "show", t("显示全部", "Show All"), true, Some("Alt+S"))
            .map_err(|e| e.to_string())?;
        let hide = MenuItem::with_id(app, "hide", t("隐藏全部", "Hide All"), true, Some("Alt+H"))
            .map_err(|e| e.to_string())?;
        let new_note =
            MenuItem::with_id(app, "new", t("新建便签", "New Note"), true, Some("Alt+N"))
                .map_err(|e| e.to_string())?;
        let export =
            MenuItem::with_id(app, "export", t("导出...", "Export..."), true, None::<&str>)
                .map_err(|e| e.to_string())?;
        let quit = MenuItem::with_id(app, "quit", t("退出", "Quit"), true, None::<&str>)
            .map_err(|e| e.to_string())?;

        let tray_menu = Menu::with_items(app, &[&show, &hide, &new_note, &export, &quit])
            .map_err(|e| e.to_string())?;

        let tray = TrayIconBuilder::new()
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&tray_menu)
            .show_menu_on_left_click(false)
            .on_menu_event(move |app, event| match event.id.as_ref() {
                "show" => window_cmd::show_all_note_windows(app),
                "hide" => window_cmd::hide_all_note_windows(app),
                "new" => {
                    if let Some(svc) = app.try_state::<Arc<NoteService>>() {
                        if let Ok(note) = svc.create_note(&t("便签", "Note")) {
                            window_cmd::spawn_note_window(app, &note).ok();
                        }
                    }
                }
                "export" => {
                    let pos = if let Some(h) = app.try_state::<TrayHandle>() {
                        if let Ok(tray) = h.0.lock() {
                            tray.rect().ok().flatten()
                        } else {
                            None
                        }
                    } else {
                        None
                    };
                    window_cmd::spawn_export_window(app, pos.as_ref()).ok();
                }
                "quit" => {
                    app.emit("quit-app", ()).ok();
                }
                _ => {}
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

        app.manage(TrayHandle(Mutex::new(tray)));

        Ok(())
    }
}
