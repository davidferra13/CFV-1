use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, Manager, Runtime,
};

pub fn create_tray<R: Runtime>(app: &App<R>) -> tauri::Result<()> {
    let open_i = MenuItem::with_id(app, "open", "Open ChefFlow", true, None::<&str>)?;
    let new_event_i = MenuItem::with_id(app, "new_event", "New Event", true, None::<&str>)?;
    let new_inquiry_i =
        MenuItem::with_id(app, "new_inquiry", "New Inquiry", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit ChefFlow", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&open_i, &new_event_i, &new_inquiry_i, &sep, &quit_i])?;

    // Use the app's default icon (embedded by tauri_build from tauri.conf.json icons)
    let icon = app
        .default_window_icon()
        .cloned()
        .expect("no app icon configured");

    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("ChefFlow — Private Chef OS")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "new_event" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.eval("window.location.href = '/events/new'");
                }
            }
            "new_inquiry" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.eval("window.location.href = '/inquiries/new'");
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // Single left-click on tray icon = show/focus the window
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
