import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

let _locale = null;

function systemLocale() {
  const lang = navigator.language || navigator.userLanguage || "en";
  return lang.toLowerCase().startsWith("zh") ? "zh" : "en";
}

/**
 * Get the current locale. Reads from config on first call.
 * Falls back to system language if config is "auto".
 */
export function getLocale() {
  if (_locale === null) {
    _locale = systemLocale();
    // Async load from config (will apply on next page load or after event)
    invoke("get_language")
      .then((pref) => {
        if (pref && pref !== "auto") {
          _locale = pref;
        }
      })
      .catch(() => {});
  }
  return _locale;
}

/**
 * Set locale manually (called by language menu).
 */
export function setLocale(lang) {
  _locale = lang;
}

// Listen for language changes from the tray menu
listen("language-changed", ({ payload: lang }) => {
  _locale = lang === "auto" ? systemLocale() : lang;
});
