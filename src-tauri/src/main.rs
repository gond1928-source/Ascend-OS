// Prevents an additional console window on Windows in release mode.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// All plugin registration, command handlers, and setup logic live in
// lib.rs (the `ascend_os_lib` library crate) — this file used to build
// its own separate `tauri::Builder` chain here instead of calling into
// it, which meant everything registered in lib.rs (including the Opener
// plugin) was dead code that never actually ran, no matter how many
// times the project was rebuilt. main.rs should just be a thin entry
// point; see lib.rs's `run()` for the real Builder chain.
fn main() {
    ascend_os_lib::run();
}
