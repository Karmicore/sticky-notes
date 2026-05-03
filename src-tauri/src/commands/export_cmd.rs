use std::sync::Arc;

use tauri::State;
use tauri_plugin_clipboard_manager::ClipboardExt;

use crate::app_core::service::NoteService;

fn notes_to_markdown(notes: &[crate::app_core::note::Note]) -> String {
    let parts: Vec<String> = notes
        .iter()
        .map(|n| {
            if n.content.is_empty() {
                format!("```\n{}\n```", n.title)
            } else {
                format!("```\n{}\n{}\n```", n.title, n.content)
            }
        })
        .collect();
    parts.join("\n\n")
}

#[tauri::command]
pub async fn export_notes_copy(
    ids: Vec<i32>,
    app: tauri::AppHandle,
    svc: State<'_, Arc<NoteService>>,
) -> Result<(), String> {
    let mut notes = Vec::new();
    for id in &ids {
        match svc.get_note(*id) {
            Ok(note) => notes.push(note),
            Err(_) => continue,
        }
    }

    if notes.is_empty() {
        return Err("No notes to export".to_string());
    }

    let markdown = notes_to_markdown(&notes);

    // 复制到剪贴板
    app.clipboard()
        .write_text(markdown)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn export_notes_cut(
    ids: Vec<i32>,
    app: tauri::AppHandle,
    svc: State<'_, Arc<NoteService>>,
) -> Result<(), String> {
    let mut notes = Vec::new();
    for id in &ids {
        match svc.get_note(*id) {
            Ok(note) => notes.push(note),
            Err(_) => continue,
        }
    }

    if notes.is_empty() {
        return Err("No notes to export".to_string());
    }

    let markdown = notes_to_markdown(&notes);

    // 复制到剪贴板
    app.clipboard()
        .write_text(markdown)
        .map_err(|e| e.to_string())?;

    // 清空便签内容
    for id in &ids {
        if let Ok(mut note) = svc.get_note(*id) {
            note.content = String::new();
            svc.save_note(note).ok();
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::app_core::note::Note;

    fn sample_note(id: i32, title: &str, content: &str) -> Note {
        Note {
            id,
            title: title.to_string(),
            content: content.to_string(),
            ..Note::default()
        }
    }

    #[test]
    fn markdown_single_note() {
        let notes = vec![sample_note(1, "Test", "Hello")];
        let md = notes_to_markdown(&notes);
        assert_eq!(md, "```\nTest\nHello\n```");
    }

    #[test]
    fn markdown_multiple_notes() {
        let notes = vec![
            sample_note(1, "Title1", "Content1"),
            sample_note(2, "Title2", "Content2"),
        ];
        let md = notes_to_markdown(&notes);
        assert_eq!(
            md,
            "```\nTitle1\nContent1\n```\n\n```\nTitle2\nContent2\n```"
        );
    }

    #[test]
    fn markdown_empty_content() {
        let notes = vec![sample_note(1, "Title", "")];
        let md = notes_to_markdown(&notes);
        assert_eq!(md, "```\nTitle\n```");
    }
}
