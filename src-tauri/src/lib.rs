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

pub fn run() {
    env_logger::init();

    // ── Core ──
    let repository: Arc<dyn NoteRepository> = Arc::new(SqliteStorage::new());
    let service = Arc::new(NoteService::new(repository.clone()));

    // ── Tray ──
    let tray = TrayPlugin::new();

    let repo_for_setup = repository.clone();

    // ── Build Tauri app ──
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(service)
        .setup(move |app| {
            let handle = app.handle().clone();

            tray.build(&handle).expect("tray build failed");

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
            commands::window_cmd::set_window_always_on_top,
            commands::window_cmd::show_all_notes,
            commands::window_cmd::hide_all_notes,
            commands::menu_cmd::open_context_menu,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
