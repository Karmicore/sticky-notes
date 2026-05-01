mod bus;
mod app_core;
mod plugins;

use std::sync::Arc;

use bus::default::DefaultEventBus;
use app_core::event::EventBus;
use app_core::note::Note;
use app_core::plugin::{Plugin, PluginContext};
use app_core::repository::NoteRepository;
use plugins::auto_save::AutoSavePlugin;
use plugins::json_storage::JsonStorage;
use plugins::tray::TrayPlugin;
use plugins::window_mgr::WindowManagerPlugin;

use tauri::Manager;

pub fn run() {
    env_logger::init();

    // Build components
    let event_bus: Arc<dyn EventBus> = Arc::new(DefaultEventBus::new());
    let repository: Arc<dyn NoteRepository> = Arc::new(JsonStorage::new());

    // Create plugins
    let mut window_mgr = WindowManagerPlugin::new();
    let mut tray = TrayPlugin::new();
    let mut auto_save = AutoSavePlugin::new();

    // Plugin context
    let mut ctx = PluginContext {
        event_bus: event_bus.clone(),
        repository: repository.clone(),
        app_handle: None,
    };

    // Init plugins
    window_mgr.init(&mut ctx).expect("window_mgr init failed");
    tray.init(&mut ctx).expect("tray init failed");
    auto_save.init(&mut ctx).expect("auto_save init failed");

    // Register event dispatch: auto_save listens for Updated events
    let auto_save_ref = Arc::new(auto_save);
    let auto_save_for_sub = auto_save_ref.clone();
    event_bus.subscribe(Box::new(move |event| {
        auto_save_for_sub.on_event(event);
    }));

    let bus_for_quit = event_bus.clone();
    let repo_for_setup = repository.clone();

    // Build Tauri app
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(repository)
        .manage(event_bus)
        .setup(move |app| {
            let handle = app.handle().clone();

            // Build tray
            tray.build_tray(&handle).expect("tray build failed");

            // Store handle for window_mgr event handling
            let wm_ctx = PluginContext {
                event_bus: bus_for_quit.clone(),
                repository: app.state::<Arc<dyn NoteRepository>>().inner().clone(),
                app_handle: Some(handle.clone()),
            };
            app.manage(wm_ctx);

            // Load notes and spawn a window for each
            let notes = repo_for_setup.load_all().unwrap_or_default();
            if notes.is_empty() {
                // No notes yet — create a default one
                let note = Note::default();
                repo_for_setup.save(&note).ok();
                plugins::window_mgr::spawn_note_window(&handle, &note)
                    .expect("failed to spawn default note window");
            } else {
                for note in &notes {
                    plugins::window_mgr::spawn_note_window(&handle, note)
                        .unwrap_or_else(|e| eprintln!("Failed to spawn window for note {}: {}", note.id, e));
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            plugins::window_mgr::load_notes,
            plugins::window_mgr::get_note,
            plugins::window_mgr::save_note,
            plugins::window_mgr::delete_note,
            plugins::window_mgr::get_next_id,
            plugins::window_mgr::set_window_always_on_top,
            plugins::window_mgr::hide_window,
            plugins::window_mgr::show_window,
            plugins::window_mgr::create_note_window,
            plugins::window_mgr::duplicate_note,
            plugins::window_mgr::close_note_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
