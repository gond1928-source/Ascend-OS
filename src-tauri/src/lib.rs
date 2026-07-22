use tauri::Manager;

mod commands;
mod tracker;

/// The one real `tauri::Builder` chain for this app. main.rs just calls
/// into this — see main.rs's comment for why that split matters (it used
/// to build its own separate, competing Builder here instead, which
/// silently no-op'd everything registered in this file).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_notification::init())
    // Native commands are registered here as the app grows.
    .invoke_handler(tauri::generate_handler![
      tracker::get_window_snapshot,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;

        // Show devtools in dev builds — was previously in main.rs, moved
        // here since main.rs no longer runs its own `.setup()`.
        let window = app.get_webview_window("main").unwrap();
        window.open_devtools();
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running Ascend OS");
}
