use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![load_app_data, save_app_data])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

fn data_file_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
  let mut dir = app
    .path()
    .app_data_dir()
    .map_err(|error| format!("Could not resolve app data directory: {error}"))?;

  std::fs::create_dir_all(&dir)
    .map_err(|error| format!("Could not create app data directory: {error}"))?;

  dir.push("hobbyflow-data.json");
  Ok(dir)
}

#[tauri::command]
fn load_app_data(app: tauri::AppHandle) -> Result<Option<String>, String> {
  let path = data_file_path(&app)?;

  if !path.exists() {
    return Ok(None);
  }

  std::fs::read_to_string(path)
    .map(Some)
    .map_err(|error| format!("Could not read app data: {error}"))
}

#[tauri::command]
fn save_app_data(app: tauri::AppHandle, json: String) -> Result<(), String> {
  let path = data_file_path(&app)?;
  let temp_path = path.with_extension("json.tmp");

  std::fs::write(&temp_path, json)
    .map_err(|error| format!("Could not write temporary app data: {error}"))?;
  std::fs::rename(temp_path, path)
    .map_err(|error| format!("Could not save app data: {error}"))
}
