use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter,
};

use crate::commands::window_cmd;

pub struct TrayPlugin;

impl TrayPlugin {
    pub fn new() -> Self {
        Self
    }

    fn create_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
        let show = MenuItem::with_id(app, "show", "显示全部", true, None::<&str>)?;
        let hide = MenuItem::with_id(app, "hide", "隐藏全部", true, None::<&str>)?;
        let new_note = MenuItem::with_id(app, "new", "新建便签", true, None::<&str>)?;
        let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
        Menu::with_items(app, &[&show, &hide, &new_note, &quit])
    }

    pub fn build(&self, app: &AppHandle) -> Result<(), String> {
        let tray_menu = Self::create_menu(app).map_err(|e| e.to_string())?;

        let _tray = TrayIconBuilder::new()
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&tray_menu)
            .show_menu_on_left_click(false)
            .on_menu_event(move |app, event| match event.id.as_ref() {
                "show" => window_cmd::show_all_note_windows(app),
                "hide" => window_cmd::hide_all_note_windows(app),
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
