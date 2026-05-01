use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: i32,
    pub title: String,
    pub content: String,
    pub color: String,
    #[serde(rename = "x")]
    pub pos_x: i32,
    #[serde(rename = "y")]
    pub pos_y: i32,
    #[serde(rename = "width")]
    pub width: u32,
    #[serde(rename = "height")]
    pub height: u32,
    #[serde(rename = "isAlwaysOnTop")]
    pub is_always_on_top: bool,
    #[serde(rename = "fontSize")]
    pub font_size: u32,
    pub opacity: f64,
    pub visible: bool,
}

impl Default for Note {
    fn default() -> Self {
        Self {
            id: 0,
            title: String::from("便签"),
            content: String::new(),
            color: String::from("#FFEB3B"),
            pos_x: 100,
            pos_y: 100,
            width: 260,
            height: 320,
            is_always_on_top: true,
            font_size: 14,
            opacity: 1.0,
            visible: true,
        }
    }
}
