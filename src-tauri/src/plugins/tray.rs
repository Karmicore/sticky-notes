use std::sync::{Arc, Mutex};

use tauri::{
    menu::{Menu, MenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

use crate::app_core::service::NoteService;
use crate::commands::{config_cmd, export_cmd, window_cmd};

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
        let export_copy = MenuItem::with_id(
            app,
            "export_copy",
            t("复制导出", "Copy Export"),
            true,
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
        let export_cut = MenuItem::with_id(
            app,
            "export_cut",
            t("剪切导出", "Cut Export"),
            true,
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
        let export_settings = MenuItem::with_id(
            app,
            "export_settings",
            t("导出设置...", "Export Settings..."),
            true,
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
        let export_menu = Submenu::with_items(
            app,
            t("导出", "Export"),
            true,
            &[&export_copy, &export_cut, &export_settings],
        )
        .map_err(|e| e.to_string())?;
        let quit = MenuItem::with_id(app, "quit", t("退出", "Quit"), true, None::<&str>)
            .map_err(|e| e.to_string())?;

        let tray_menu = Menu::with_items(app, &[&show, &hide, &new_note, &export_menu, &quit])
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
                "export_copy" => {
                    if let Some(svc) = app.try_state::<Arc<NoteService>>() {
                        let ids = config_cmd::get_export_selected_ids().unwrap_or_default();
                        if !ids.is_empty() {
                            export_cmd::do_export_copy(&ids, app, &svc).ok();
                        }
                    }
                }
                "export_cut" => {
                    if let Some(svc) = app.try_state::<Arc<NoteService>>() {
                        let ids = config_cmd::get_export_selected_ids().unwrap_or_default();
                        if !ids.is_empty() {
                            export_cmd::do_export_cut(&ids, app, &svc).ok();
                        }
                    }
                }
                "export_settings" => {
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
