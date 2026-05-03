/**
 * 检测系统语言，返回 'zh' 或 'en'
 * 中文系统（zh-CN, zh-TW, zh-HK 等）返回 'zh'
 * 其他语言返回 'en'
 */
export function detectLocale() {
  // Tauri 环境中通过 navigator.language 获取系统语言
  const lang = navigator.language || navigator.userLanguage || 'en';
  return lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

// 缓存检测结果
let _locale = null;

export function getLocale() {
  if (_locale === null) {
    _locale = detectLocale();
  }
  return _locale;
}
