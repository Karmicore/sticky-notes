import { invoke } from "@tauri-apps/api/core";

const STORAGE_KEY = "stickynotes_language";

let _locale = null;

function systemLocale() {
  const lang = navigator.language || navigator.userLanguage || "en";
  return lang.toLowerCase().startsWith("zh") ? "zh" : "en";
}

/**
 * Get the current locale.
 * Reads from localStorage first (sync), then async-loads from config.
 */
export function getLocale() {
  if (_locale === null) {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached && cached !== "auto") {
      _locale = cached;
    } else {
      _locale = systemLocale();
    }
    invoke("get_language")
      .then((pref) => {
        if (pref && pref !== "auto") {
          _locale = pref;
        }
        localStorage.setItem(STORAGE_KEY, pref || "auto");
      })
      .catch(() => {});
  }
  return _locale;
}

/**
 * Set locale manually (called before page reload on language change).
 */
export function setLocale(lang) {
  _locale = lang;
  localStorage.setItem(STORAGE_KEY, lang);
}
