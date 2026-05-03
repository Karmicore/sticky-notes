use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    #[serde(default)]
    pub export_selected_ids: Vec<i32>,
}

fn config_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".stickynotes")
}

fn config_path() -> PathBuf {
    config_dir().join("config.json")
}

fn load_config() -> AppConfig {
    let path = config_path();
    if !path.exists() {
        return AppConfig::default();
    }
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => AppConfig::default(),
    }
}

fn save_config(config: &AppConfig) -> Result<(), String> {
    let dir = config_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("config.json");
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_export_selected_ids() -> Result<Vec<i32>, String> {
    let config = load_config();
    Ok(config.export_selected_ids)
}

#[tauri::command]
pub fn set_export_selected_ids(ids: Vec<i32>) -> Result<(), String> {
    let mut config = load_config();
    config.export_selected_ids = ids;
    save_config(&config)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_is_empty() {
        let config = AppConfig::default();
        assert!(config.export_selected_ids.is_empty());
    }

    #[test]
    fn serde_roundtrip() {
        let config = AppConfig {
            export_selected_ids: vec![1, 2, 3],
        };
        let json = serde_json::to_string(&config).unwrap();
        let loaded: AppConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(loaded.export_selected_ids, vec![1, 2, 3]);
    }
}
