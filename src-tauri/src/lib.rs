mod app_core;
mod commands;
mod infra;
mod plugins;

use std::sync::Arc;

use app_core::note::Note;
use app_core::repository::NoteRepository;
use app_core::service::NoteService;
use infra::json_storage::JsonStorage;
use plugins::tray::TrayPlugin;

pub fn run() {
    env_logger::init();

    // ── Core ──
    let repository: Arc<dyn NoteRepository> = Arc::new(JsonStorage::new());
    let service = Arc::new(NoteService::new(repository.clone()));

    // ── Tray ──
    let tray = TrayPlugin::new();

    let repo_for_setup = repository.clone();

    // ── Build Tauri app ──
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(service)
        .setup(move |app| {
            let handle = app.handle().clone();

            tray.build(&handle).expect("tray build failed");

            // Spawn windows for existing notes
            let notes = repo_for_setup.load_all().unwrap_or_default();
            if notes.is_empty() {
                let note = Note::default();
                repo_for_setup.save(&note).ok();
                commands::spawn_note_window(&handle, &note)
                    .expect("failed to spawn default note window");
            } else {
                for note in &notes {
                    commands::spawn_note_window(&handle, note)
                        .unwrap_or_else(|e| eprintln!("spawn note {}: {}", note.id, e));
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_notes,
            commands::get_note,
            commands::save_note,
            commands::delete_note,
            commands::set_window_always_on_top,
            commands::hide_window,
            commands::show_window,
            commands::show_all_notes,
            commands::hide_all_notes,
            commands::create_note_window,
            commands::duplicate_note,
            commands::close_note_window,
            commands::open_context_menu,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
