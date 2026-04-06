#[cfg(desktop)]
mod tray;

pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init());

    // Autostart is desktop-only
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_autostart::init(
        tauri_plugin_autostart::MacosLauncher::LaunchAgent,
        None,
    ));

    builder
        .setup(|app| {
            #[cfg(desktop)]
            tray::create_tray(app)?;
            let _ = app;
            Ok(())
        })
        .on_window_event(|window, event| {
            #[cfg(desktop)]
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
            #[cfg(not(desktop))]
            { let _ = (window, event); }
        })
        .run(tauri::generate_context!())
        .expect("error while running ChefFlow");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn mobile_entry() {
    run();
}
