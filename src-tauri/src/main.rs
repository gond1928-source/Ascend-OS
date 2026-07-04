// Prevents an additional console window on Windows in release mode.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod commands;

fn main() {
    tauri::Builder::default()
        // Native commands are registered here as the app grows.
        // e.g. .invoke_handler(tauri::generate_handler![commands::get_active_window])
        .invoke_handler(tauri::generate_handler![])
        // Show the window only once the frontend is fully loaded — avoids
        // the white flash on startup.
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Ascend OS");
}
