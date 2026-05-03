mod app_core;
mod commands;
mod infra;
mod plugins;

use std::sync::Arc;

use app_core::note::Note;
use app_core::repository::NoteRepository;
use app_core::service::NoteService;
use commands::window_cmd;
use infra::sqlite_storage::SqliteStorage;
use plugins::tray::TrayPlugin;
use tauri::Manager;

pub fn run() {
    env_logger::init();

    // ── Core ──
    let repository: Arc<dyn NoteRepository> = Arc::new(SqliteStorage::new());
    let service = Arc::new(NoteService::new(repository.clone()));

    // ── Tray ──
    let tray = TrayPlugin::new();

    let repo_for_setup = repository.clone();

    // ── Global shortcuts ──
    use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
    let show_shortcut = Shortcut::new(Some(Modifiers::ALT), Code::KeyS);
    let hide_shortcut = Shortcut::new(Some(Modifiers::ALT), Code::KeyH);

    // ── Build Tauri app ──
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |_app, shortcut, _event| {
                    if shortcut == &show_shortcut {
                        window_cmd::show_all_note_windows(&_app.app_handle());
                    } else if shortcut == &hide_shortcut {
                        window_cmd::hide_all_note_windows(&_app.app_handle());
                    }
                })
                .build(),
        )
        .manage(service)
        .setup(move |app| {
            let handle = app.handle().clone();

            tray.build(&handle).expect("tray build failed");

            // Register global shortcuts (plugin already initialized above)
            if let Err(e) = handle.global_shortcut().register(show_shortcut) {
                eprintln!("Failed to register Alt+S: {}", e);
            }
            if let Err(e) = handle.global_shortcut().register(hide_shortcut) {
                eprintln!("Failed to register Alt+H: {}", e);
            }

            // Spawn windows for existing notes
            let notes = repo_for_setup.load_all().unwrap_or_default();
            if notes.is_empty() {
                let note = Note::default();
                repo_for_setup.save(&note).ok();
                window_cmd::spawn_note_window(&handle, &note)
                    .expect("failed to spawn default note window");
            } else {
                for note in &notes {
                    window_cmd::spawn_note_window(&handle, note)
                        .unwrap_or_else(|e| eprintln!("spawn note {}: {}", note.id, e));
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::note_cmd::get_note,
            commands::note_cmd::save_note,
            commands::note_cmd::delete_note,
            commands::note_cmd::create_note_window,
            commands::note_cmd::duplicate_note,
            commands::note_cmd::close_note_window,
            commands::note_cmd::load_all_notes,
            commands::note_cmd::get_all_notes_rect,
            commands::window_cmd::set_window_always_on_top,
            commands::window_cmd::show_all_notes,
            commands::window_cmd::hide_all_notes,
            commands::window_cmd::toggle_note_collapsed,
            commands::window_cmd::collapse_all_notes,
            commands::window_cmd::expand_all_notes,
            commands::window_cmd::open_export_window,
            commands::export_cmd::export_notes_copy,
            commands::export_cmd::export_notes_cut,
            commands::config_cmd::get_export_selected_ids,
            commands::config_cmd::set_export_selected_ids,
            commands::config_cmd::get_language,
            commands::config_cmd::set_language,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
