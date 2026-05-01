use std::sync::Arc;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

use crate::app_core::event::{EventBus, NoteEvent};

pub struct TrayPlugin {
    bus: Option<Arc<dyn EventBus>>,
}

impl TrayPlugin {
    pub fn new() -> Self {
        Self { bus: None }
    }

    pub fn init(&mut self, bus: Arc<dyn EventBus>) {
        self.bus = Some(bus);
    }

    fn create_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
        let show = MenuItem::with_id(app, "show", "显示全部", true, None::<&str>)?;
        let hide = MenuItem::with_id(app, "hide", "隐藏全部", true, None::<&str>)?;
        let new_note = MenuItem::with_id(app, "new", "新建便签", true, None::<&str>)?;
        let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
        Menu::with_items(app, &[&show, &hide, &new_note, &quit])
    }

    pub fn build(&self, app: &AppHandle) -> Result<(), String> {
        let bus = self.bus.clone().ok_or("tray not initialized")?;
        let tray_menu = Self::create_menu(app).map_err(|e| e.to_string())?;

        let bus_for_menu = bus.clone();
        let _tray = TrayIconBuilder::new()
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&tray_menu)
            .show_menu_on_left_click(false)
            .on_menu_event(move |app, event| match event.id.as_ref() {
                "show" => {
                    for (label, window) in app.webview_windows() {
                        if label.starts_with("note-") {
                            window.show().ok();
                            window.set_focus().ok();
                        }
                    }
                    bus_for_menu.emit(NoteEvent::ShowAll);
                }
                "hide" => {
                    for (label, window) in app.webview_windows() {
                        if label.starts_with("note-") {
                            window.hide().ok();
                        }
                    }
                    bus_for_menu.emit(NoteEvent::HideAll);
                }
                "new" => {
                    app.emit("create-note", ()).ok();
                }
                "quit" => {
                    bus_for_menu.emit(NoteEvent::Quit);
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
                    let app = tray.app_handle();
                    for (label, window) in app.webview_windows() {
                        if label.starts_with("note-") {
                            window.show().ok();
                            window.set_focus().ok();
                        }
                    }
                }
            })
            .build(app)
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}
