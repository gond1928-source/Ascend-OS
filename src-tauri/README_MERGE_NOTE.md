# ⚠️ Read before copying this folder over your real src-tauri

## The actual bug (found by inspecting main.rs)

Your `main.rs` was building its own, separate `tauri::Builder::default()`
chain — completely independent from the one in `lib.rs`. `main()` never
called `ascend_os_lib::run()`. That means everything registered in
`lib.rs` — including `tauri_plugin_opener::init()` — was dead code that
never ran, no matter how many times you rebuilt. That's why "plugin
opener not found" persisted even after a correct `lib.rs`, `Cargo.toml`,
and `capabilities/default.json`: those three were never the problem.
This was.

## What's in this folder

Five files, all now consistent with each other:

- `Cargo.toml` — unchanged from what you uploaded, already correct
  (`tauri-plugin-opener = "2"`).
- `capabilities/default.json` — unchanged from what you uploaded, already
  correct (`opener:default`, no stray `shell:*`).
- `src/main.rs` — **rewritten**. Now just calls `ascend_os_lib::run()`.
  Nothing else.
- `src/lib.rs` — **rewritten**. This is now the ONE real Builder chain —
  merged from both your old main.rs and lib.rs, so nothing is lost:
  - Plugins: dialog, fs, opener (all three, previously split across two
    files), plus the log plugin in debug builds (unchanged from your
    original lib.rs).
  - `invoke_handler` for `tracker::get_window_snapshot` (moved from
    main.rs — unchanged).
  - Opens devtools in debug builds (moved from main.rs's `.setup()` —
    unchanged, just now living in the setup closure that actually runs).

## What's still NOT here

`commands.rs`, `tracker.rs`, `build.rs`, `tauri.conf.json`, `Cargo.lock`,
`icons/`, `gen/`, `target/` — none of these were uploaded to me, so I
can't include or verify them. `mod commands;` and `mod tracker;` now live
in the new `lib.rs` (moved from the old `main.rs` — same physical files
`src/commands.rs`/`src/tracker.rs`, just declared from the other side).
Do NOT delete your real `src-tauri` and drop this one in wholesale — copy
these 5 files over their matching files, nothing else.

## Rebuild (Rust changes never hot-reload)

```
1. Stop tauri dev completely (Ctrl+C, confirm the process is actually dead)
2. npm install
3. cd src-tauri && cargo clean && cd ..
4. npm run tauri:dev
```

Watch the terminal for actual Rust compiler output ("Compiling ascend-os
v0.1.0..."). If you don't see Rust compiling, the backend still isn't
rebuilding.

If it's still broken after this, the fastest way forward is uploading
`commands.rs` and `tracker.rs` too — merging main.rs into lib.rs is
exactly the kind of change that can surface a naming collision or missing
import in files I haven't seen, and I'd rather check than guess.
