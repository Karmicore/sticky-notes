use std::sync::Arc;

use tauri::State;
use tauri_plugin_clipboard_manager::ClipboardExt;

use crate::app_core::note::Note;
use crate::app_core::service::NoteService;

fn fetch_notes(ids: &[i32], svc: &NoteService) -> Result<Vec<Note>, String> {
    let notes: Vec<Note> = ids.iter().filter_map(|id| svc.get_note(*id).ok()).collect();
    if notes.is_empty() {
        return Err("No notes to export".to_string());
    }
    Ok(notes)
}

fn notes_to_markdown(notes: &[Note]) -> String {
    let parts: Vec<String> = notes
        .iter()
        .map(|n| {
            let title = n.title.trim();
            let content = n.content.trim();
            if content.is_empty() {
                format!("```\n{}\n```", title)
            } else {
                format!("```\n{}\n{}\n```", title, content)
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
    let notes = fetch_notes(&ids, &svc)?;
    let markdown = notes_to_markdown(&notes);
    app.clipboard()
        .write_text(markdown)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn export_notes_cut(
    ids: Vec<i32>,
    app: tauri::AppHandle,
    svc: State<'_, Arc<NoteService>>,
) -> Result<(), String> {
    let notes = fetch_notes(&ids, &svc)?;
    let markdown = notes_to_markdown(&notes);

    app.clipboard()
        .write_text(markdown)
        .map_err(|e| e.to_string())?;

    // 清空便签内容
    for id in &ids {
        if let Ok(mut note) = svc.get_note(*id) {
            note.content = String::new();
            svc.save_note(note).map_err(|e| format!("Failed to clear note {}: {}", id, e))?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

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

    #[test]
    fn markdown_trims_whitespace() {
        let notes = vec![sample_note(1, "  Title  ", "  Content  ")];
        let md = notes_to_markdown(&notes);
        assert_eq!(md, "```\nTitle\nContent\n```");
    }

    #[test]
    fn markdown_trims_multiline_content() {
        let notes = vec![sample_note(1, "Title", "  Line1\n  Line2  ")];
        let md = notes_to_markdown(&notes);
        assert_eq!(md, "```\nTitle\nLine1\n  Line2\n```");
    }
}
