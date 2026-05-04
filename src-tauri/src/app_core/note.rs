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
    #[serde(default)]
    pub locked: bool,
    #[serde(default)]
    pub collapsed: bool,
    #[serde(default = "default_expanded_height")]
    pub expanded_height: u32,
    #[serde(default = "default_expanded_width")]
    pub expanded_width: u32,
    #[serde(default)]
    pub glass: f64,
}

fn default_expanded_height() -> u32 {
    240
}

fn default_expanded_width() -> u32 {
    260
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
            locked: false,
            collapsed: false,
            expanded_height: 240,
            expanded_width: 260,
            glass: 0.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_values() {
        let n = Note::default();
        assert_eq!(n.id, 0);
        assert_eq!(n.title, "便签");
        assert!(n.content.is_empty());
        assert_eq!(n.color, "#FFEB3B");
        assert!(n.is_always_on_top);
        assert!(!n.locked);
        assert!(!n.collapsed);
    }

    #[test]
    fn serde_roundtrip() {
        let note = Note {
            id: 5,
            title: "测试".into(),
            content: "内容\n换行".into(),
            color: "#BBDEFB".into(),
            pos_x: -10,
            pos_y: 20,
            width: 300,
            height: 400,
            is_always_on_top: false,
            font_size: 18,
            opacity: 0.7,
            visible: true,
            locked: true,
            collapsed: true,
            expanded_height: 400,
            expanded_width: 300,
            glass: 0.5,
        };
        let json = serde_json::to_string(&note).unwrap();
        let deserialized: Note = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, 5);
        assert_eq!(deserialized.title, "测试");
        assert_eq!(deserialized.content, "内容\n换行");
        assert_eq!(deserialized.pos_x, -10);
        assert!(!deserialized.is_always_on_top);
        assert!(deserialized.locked);
        assert!(deserialized.collapsed);
        assert!((deserialized.glass - 0.5).abs() < f64::EPSILON);
    }

    #[test]
    fn serde_json_field_names_match_frontend() {
        let note = Note::default();
        let json = serde_json::to_value(&note).unwrap();
        // Frontend uses camelCase
        assert!(json.get("isAlwaysOnTop").is_some());
        assert!(json.get("fontSize").is_some());
        // Frontend uses x/y not pos_x/pos_y
        assert!(json.get("x").is_some());
        assert!(json.get("y").is_some());
        // pos_x/pos_y should NOT appear
        assert!(json.get("pos_x").is_none());
        assert!(json.get("pos_y").is_none());
        assert!(json.get("glass").is_some());
    }

    #[test]
    fn serde_missing_optional_fields_use_defaults() {
        let json = r##"{"id":1,"title":"t","content":"c","color":"#FFEB3B","x":0,"y":0,"width":200,"height":200,"isAlwaysOnTop":true,"fontSize":14,"opacity":1.0,"visible":true}"##;
        let note: Note = serde_json::from_str(json).unwrap();
        assert!(!note.locked);
        assert!(!note.collapsed);
        assert_eq!(note.expanded_height, 240);
        assert_eq!(note.expanded_width, 260);
        assert!((note.glass - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn serde_extra_fields_ignored() {
        let json = r##"{"id":1,"title":"t","content":"c","color":"#FFEB3B","x":0,"y":0,"width":200,"height":200,"isAlwaysOnTop":true,"fontSize":14,"opacity":1.0,"visible":true,"unknownField":"hello"}"##;
        let result: Result<Note, _> = serde_json::from_str(json);
        assert!(result.is_ok());
    }

    #[test]
    fn serde_invalid_type_fails() {
        let json = r##"{"id":"not_a_number","title":"t","content":"c","color":"#FFEB3B","x":0,"y":0,"width":200,"height":200,"isAlwaysOnTop":true,"fontSize":14,"opacity":1.0,"visible":true}"##;
        let result: Result<Note, _> = serde_json::from_str(json);
        assert!(result.is_err());
    }
}
