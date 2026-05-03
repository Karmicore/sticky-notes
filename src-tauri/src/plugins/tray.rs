use std::sync::{Arc, Mutex};

use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

use crate::app_core::service::NoteService;
use crate::commands::{config_cmd, export_cmd, window_cmd};

pub struct TrayHandle(pub Mutex<TrayIcon>);

fn resolved_language() -> String {
    let pref = config_cmd::load_language();
    if pref != "auto" {
        return pref;
    }
    sys_locale::get_locale()
        .map(|l| if l.to_lowercase().starts_with("zh") { "zh" } else { "en" }.to_string())
        .unwrap_or_else(|| "en".to_string())
}

fn is_chinese() -> bool {
    resolved_language() == "zh"
}

fn t(zh: &str, en: &str) -> String {
    if is_chinese() { zh.to_string() } else { en.to_string() }
}

pub struct TrayPlugin;

impl TrayPlugin {
    pub fn new() -> Self { Self }

    fn build_menu(app: &AppHandle) -> Result<Menu<tauri::Wry>, String> {
        let lang = config_cmd::load_language();

        let show = MenuItem::with_id(app, "show", t("显示全部", "Show All"), true, Some("Alt+S"))
            .map_err(|e| e.to_string())?;
        let hide = MenuItem::with_id(app, "hide", t("隐藏全部", "Hide All"), true, Some("Alt+H"))
            .map_err(|e| e.to_string())?;
        let new_note = MenuItem::with_id(app, "new", t("新建便签", "New Note"), true, Some("Alt+N"))
            .map_err(|e| e.to_string())?;

        // Export submenu
        let export_copy = MenuItem::with_id(app, "export_copy", t("复制导出", "Copy Export"), true, None::<&str>)
            .map_err(|e| e.to_string())?;
        let export_cut = MenuItem::with_id(app, "export_cut", t("剪切导出", "Cut Export"), true, None::<&str>)
            .map_err(|e| e.to_string())?;
        let export_settings = MenuItem::with_id(app, "export_settings", t("导出设置...", "Export Settings..."), true, None::<&str>)
            .map_err(|e| e.to_string())?;
        let export_menu = Submenu::with_items(app, t("导出", "Export"), true, &[&export_copy, &export_cut, &export_settings])
            .map_err(|e| e.to_string())?;

        // Language submenu
        let lang_auto = CheckMenuItem::with_id(app, "lang_auto", t("自动", "Auto"), true, lang == "auto", None::<&str>)
            .map_err(|e| e.to_string())?;
        let lang_zh = CheckMenuItem::with_id(app, "lang_zh", "中文", true, lang == "zh", None::<&str>)
            .map_err(|e| e.to_string())?;
        let lang_en = CheckMenuItem::with_id(app, "lang_en", "English", true, lang == "en", None::<&str>)
            .map_err(|e| e.to_string())?;
        let lang_menu = Submenu::with_items(app, t("语言", "Language"), true, &[&lang_auto, &lang_zh, &lang_en])
            .map_err(|e| e.to_string())?;

        let quit = MenuItem::with_id(app, "quit", t("退出", "Quit"), true, None::<&str>)
            .map_err(|e| e.to_string())?;

        Menu::with_items(app, &[&show, &hide, &new_note, &export_menu, &lang_menu, &quit])
            .map_err(|e| e.to_string())
    }

    fn rebuild_menu(app: &AppHandle) {
        if let Ok(menu) = Self::build_menu(app) {
            if let Some(h) = app.try_state::<TrayHandle>() {
                if let Ok(tray) = h.0.lock() {
                    tray.set_menu(Some(menu)).ok();
                }
            }
        }
    }

    pub fn build(&self, app: &AppHandle) -> Result<(), String> {
        let tray_menu = Self::build_menu(app)?;

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
                        } else { None }
                    } else { None };
                    window_cmd::spawn_export_window(app, pos.as_ref()).ok();
                }
                "lang_auto" | "lang_zh" | "lang_en" => {
                    let lang = match event.id.as_ref() {
                        "lang_zh" => "zh",
                        "lang_en" => "en",
                        _ => "auto",
                    };
                    config_cmd::set_language(lang.to_string()).ok();
                    Self::rebuild_menu(app);
                    app.emit("language-changed", lang).ok();
                }
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

        app.manage(TrayHandle(Mutex::new(tray)));
        Ok(())
    }
}
