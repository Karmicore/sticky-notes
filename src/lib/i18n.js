import { getLocale } from './locale';

const texts = {
  // 菜单命令
  'menu.note.new': { zh: '新建便签', en: 'New Note' },
  'menu.note.duplicate': { zh: '复制便签', en: 'Duplicate Note' },
  'menu.note.rename': { zh: '重命名', en: 'Rename' },
  'menu.note.delete': { zh: '删除便签', en: 'Delete Note' },
  'menu.note.hide': { zh: '隐藏便签', en: 'Hide Note' },
  'menu.note.checkbox': { zh: '添加待办', en: 'Add Todo' },
  'menu.note.pin': { zh: '始终置顶', en: 'Always on Top' },
  'menu.note.lock': { zh: '锁定便签', en: 'Lock Note' },
  'menu.note.collapse.toggle': { zh: '折叠/展开', en: 'Collapse/Expand' },
  'menu.font.up': { zh: '字体增大', en: 'Increase Font' },
  'menu.font.down': { zh: '字体减小', en: 'Decrease Font' },
  'menu.opacity.up': { zh: '透明度增大', en: 'Increase Opacity' },
  'menu.opacity.down': { zh: '透明度减小', en: 'Decrease Opacity' },
  'menu.opacity': { zh: '透明度', en: 'Opacity' },
  'menu.color': { zh: '颜色', en: 'Color' },
  'menu.window.show_all': { zh: '显示全部', en: 'Show All' },
  'menu.window.hide_all': { zh: '隐藏全部', en: 'Hide All' },

  // 导出菜单
  'menu.export': { zh: '导出', en: 'Export' },
  'menu.export.copy': { zh: '复制式导出', en: 'Copy Export' },
  'menu.export.cut': { zh: '剪切式导出', en: 'Cut Export' },
  'menu.export.select': { zh: '选择便签...', en: 'Select Notes...' },

  // 托盘菜单
  'tray.show': { zh: '显示全部', en: 'Show All' },
  'tray.hide': { zh: '隐藏全部', en: 'Hide All' },
  'tray.toggle_collapse': { zh: '折叠全部', en: 'Collapse All' },
  'tray.expand_all': { zh: '展开全部', en: 'Expand All' },
  'tray.new': { zh: '新建便签', en: 'New Note' },
  'tray.export': { zh: '导出', en: 'Export' },
  'tray.export.copy': { zh: '复制导出', en: 'Copy Export' },
  'tray.export.cut': { zh: '剪切导出', en: 'Cut Export' },
  'tray.export.settings': { zh: '导出设置...', en: 'Export Settings...' },
  'tray.quit': { zh: '退出', en: 'Quit' },

  // 颜色名
  'color.yellow': { zh: '黄', en: 'Yellow' },
  'color.blue': { zh: '蓝', en: 'Blue' },
  'color.green': { zh: '绿', en: 'Green' },
  'color.pink': { zh: '粉', en: 'Pink' },
  'color.purple': { zh: '紫', en: 'Purple' },
  'color.orange': { zh: '橙', en: 'Orange' },
  'color.white': { zh: '白', en: 'White' },
  'color.lightBlue': { zh: '浅蓝', en: 'Light Blue' },
  'color.lightGreen': { zh: '浅绿', en: 'Light Green' },
  'color.red': { zh: '红', en: 'Red' },
  'color.lightPink': { zh: '浅粉', en: 'Light Pink' },
  'color.gray': { zh: '灰', en: 'Gray' },

  // 编辑器
  'editor.placeholder': { zh: '输入内容...', en: 'Type content...' },

  // 导出面板
  'export.title': { zh: '选择要导出的便签', en: 'Select Notes to Export' },
  'export.selectAll': { zh: '全选', en: 'Select All' },
  'export.deselectAll': { zh: '取消全选', en: 'Deselect All' },
  'export.confirm': { zh: '确定', en: 'Confirm' },
  'export.cancel': { zh: '取消', en: 'Cancel' },
  'export.copy': { zh: '复制式导出', en: 'Copy Export' },
  'export.cut': { zh: '剪切式导出', en: 'Cut Export' },
  'export.cutConfirm': { zh: '剪切导出，便签将为空', en: 'Cut export, notes will be emptied' },
  'export.success': { zh: '已复制到剪贴板', en: 'Copied to clipboard' },
  'export.cutSuccess': { zh: '已剪切到剪贴板', en: 'Cut to clipboard' },
  'export.loading': { zh: '加载中...', en: 'Loading...' },
  'export.failed': { zh: '导出失败', en: 'Export failed' },
  'export.noNotes': { zh: '没有可导出的便签', en: 'No notes to export' },
  'export.windowTitle': { zh: '导出便签', en: 'Export Notes' },

  // 默认便签标题
  'note.defaultTitle': { zh: '便签', en: 'Note' },
  'note.duplicateSuffix': { zh: '(副本)', en: '(copy)' },
};

/**
 * 获取翻译文本
 * @param {string} key - 文本键名
 * @returns {string} 翻译后的文本
 */
export function t(key) {
  const locale = getLocale();
  const entry = texts[key];
  if (!entry) return key;
  return entry[locale] || entry.en || key;
}
