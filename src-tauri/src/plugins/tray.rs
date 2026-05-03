use std::sync::Arc;

use tauri::{
    menu::{Menu, MenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

use crate::app_core::service::NoteService;
use crate::commands::window_cmd;

const COLLAPSED_HEIGHT: u32 = 28;

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
        let show = MenuItem::with_id(app, "show", t("显示全部", "Show All"), true, Some("Alt+S"))
            .map_err(|e| e.to_string())?;
        let hide = MenuItem::with_id(app, "hide", t("隐藏全部", "Hide All"), true, Some("Alt+H"))
            .map_err(|e| e.to_string())?;
        let toggle_collapse = MenuItem::with_id(
            app,
            "toggle_collapse",
            t("折叠全部", "Collapse All"),
            true,
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
        let new_note =
            MenuItem::with_id(app, "new", t("新建便签", "New Note"), true, Some("Alt+N"))
                .map_err(|e| e.to_string())?;

        // 导出子菜单
        let export_copy = MenuItem::with_id(
            app,
            "export_copy",
            t("复制式导出", "Copy Export"),
            true,
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
        let export_cut = MenuItem::with_id(
            app,
            "export_cut",
            t("剪切式导出", "Cut Export"),
            true,
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
        let export_select = MenuItem::with_id(
            app,
            "export_select",
            t("选择便签...", "Select Notes..."),
            true,
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
        let export_menu = Submenu::with_items(
            app,
            t("导出", "Export"),
            true,
            &[&export_copy, &export_cut, &export_select],
        )
        .map_err(|e| e.to_string())?;

        let quit = MenuItem::with_id(app, "quit", t("退出", "Quit"), true, None::<&str>)
            .map_err(|e| e.to_string())?;

        let tray_menu = Menu::with_items(
            app,
            &[
                &show,
                &hide,
                &toggle_collapse,
                &new_note,
                &export_menu,
                &quit,
            ],
        )
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
                            toggle_collapse.set_text(&t("折叠全部", "Collapse All")).ok();
                        } else {
                            window_cmd::collapse_all_note_windows(app, &svc);
                            toggle_collapse.set_text(&t("展开全部", "Expand All")).ok();
                        }
                    }
                }
                "new" => {
                    if let Some(svc) = app.try_state::<Arc<NoteService>>() {
                        if let Ok(note) = svc.create_note(&t("便签", "Note")) {
                            window_cmd::spawn_note_window(app, &note).ok();
                        }
                    }
                }
                "export_copy" => {
                    // 触发复制式导出事件到前端
                    app.emit("trigger-export", "copy").ok();
                }
                "export_cut" => {
                    // 触发剪切式导出事件到前端
                    app.emit("trigger-export", "cut").ok();
                }
                "export_select" => {
                    // 打开导出窗口
                    window_cmd::spawn_export_window(app).ok();
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

        Ok(())
    }
}
