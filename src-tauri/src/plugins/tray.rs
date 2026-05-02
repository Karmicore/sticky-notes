use std::sync::Arc;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

use crate::app_core::service::NoteService;
use crate::commands::window_cmd;

const COLLAPSED_HEIGHT: u32 = 28;

pub struct TrayPlugin;

impl TrayPlugin {
    pub fn new() -> Self {
        Self
    }

    fn any_collapsed(app: &AppHandle) -> bool {
        for (label, window) in app.webview_windows() {
            if !label.starts_with("note-") {
                continue;
            }
            if let Ok(size) = window.inner_size() {
                if size.height <= COLLAPSED_HEIGHT + 2 {
                    return true;
                }
            }
        }
        false
    }

    pub fn build(&self, app: &AppHandle) -> Result<(), String> {
        let show = MenuItem::with_id(app, "show", "显示全部", true, Some("Alt+S"))
            .map_err(|e| e.to_string())?;
        let hide = MenuItem::with_id(app, "hide", "隐藏全部", true, Some("Alt+H"))
            .map_err(|e| e.to_string())?;
        let toggle_collapse = MenuItem::with_id(app, "toggle_collapse", "折叠全部", true, None::<&str>)
            .map_err(|e| e.to_string())?;
        let new_note = MenuItem::with_id(app, "new", "新建便签", true, Some("Alt+N"))
            .map_err(|e| e.to_string())?;
        let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)
            .map_err(|e| e.to_string())?;

        let tray_menu = Menu::with_items(app, &[&show, &hide, &toggle_collapse, &new_note, &quit])
            .map_err(|e| e.to_string())?;

        let _tray = TrayIconBuilder::new()
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&tray_menu)
            .show_menu_on_left_click(false)
            .on_menu_event(move |app, event| match event.id.as_ref() {
                "show" => window_cmd::show_all_note_windows(app),
                "hide" => window_cmd::hide_all_note_windows(app),
                "toggle_collapse" => {
                    if let Some(svc) = app.try_state::<Arc<NoteService>>() {
                        if Self::any_collapsed(app) {
                            window_cmd::expand_all_note_windows(app, &svc);
                            toggle_collapse.set_text("折叠全部").ok();
                        } else {
                            window_cmd::collapse_all_note_windows(app, &svc);
                            toggle_collapse.set_text("展开全部").ok();
                        }
                    }
                }
                "new" => { app.emit("create-note", ()).ok(); }
                "quit" => { app.emit("quit-app", ()).ok(); }
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

        Ok(())
    }
}
