<script setup>
import { ref, onMounted, computed } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

const notes = ref([]);
const settingsDialog = ref(null);
const currentEditingNote = ref(null);
const screenWidth = ref(window.innerWidth);
const screenHeight = ref(window.innerHeight);

const colors = [
  { name: "黄", hex: "#FFEB3B" },
  { name: "蓝", hex: "#BBDEFB" },
  { name: "绿", hex: "#C8E6C9" },
  { name: "粉", hex: "#F8BBD9" },
  { name: "白", hex: "#FFFFFF" },
];

onMounted(async () => {
  await loadNotes();

  listen("show-all", () => {
    notes.value.forEach((n) => (n.visible = true));
  });

  listen("hide-all", () => {
    notes.value.forEach((n) => (n.visible = false));
  });

  listen("create-note", () => {
    createNote();
  });

  listen("quit-app", async () => {
    for (const note of notes.value) {
      await saveNote(note);
    }
    const win = getCurrentWindow();
    await win.close();
  });
});

async function loadNotes() {
  try {
    const loadedNotes = await invoke("load_notes");
    notes.value = loadedNotes.map((n) => ({
      ...n,
      visible: n.visible !== false,
    }));
    if (notes.value.length === 0) {
      await createNote();
    }
  } catch (e) {
    console.error("Failed to load notes:", e);
    await createNote();
  }
}

async function saveNote(note) {
  try {
    await invoke("save_note", { note });
  } catch (e) {
    console.error("Failed to save note:", e);
  }
}

async function createNote() {
  try {
    const id = await invoke("get_next_id");
    const offset = notes.value.length * 25;
    const x = (100 + offset) % Math.max(screenWidth.value - 200, 200);
    const y = (100 + Math.floor(offset / 10) * 25) % Math.max(screenHeight.value - 200, 200);

    const newNote = {
      id,
      title: `便签 ${id + 1}`,
      content: "",
      color: "#FFEB3B",
      x,
      y,
      width: 260,
      height: 320,
      isAlwaysOnTop: true,
      fontSize: 14,
      opacity: 1.0,
      visible: true,
    };

    notes.value.push(newNote);
    await saveNote(newNote);
    currentEditingNote.value = newNote;
  } catch (e) {
    console.error("Failed to create note:", e);
  }
}

async function deleteNote(note) {
  try {
    await invoke("delete_note", { id: note.id });
    notes.value = notes.value.filter((n) => n.id !== note.id);
    if (currentEditingNote.value?.id === note.id) {
      currentEditingNote.value = null;
      settingsDialog.value = null;
    }
    if (notes.value.length === 0) {
      await createNote();
    }
  } catch (e) {
    console.error("Failed to delete note:", e);
  }
}

async function updateNote(note) {
  note.isDirty = true;
  clearTimeout(note.saveTimer);
  note.saveTimer = setTimeout(async () => {
    await saveNote(note);
    note.isDirty = false;
  }, 800);
}

async function togglePin(note) {
  note.isAlwaysOnTop = !note.isAlwaysOnTop;
  try {
    await invoke("set_window_always_on_top", { onTop: note.isAlwaysOnTop });
    await saveNote(note);
  } catch (e) {
    console.error("Failed to toggle pin:", e);
  }
}

function openSettings(note) {
  currentEditingNote.value = note;
  settingsDialog.value = "settings";
}

async function closeSettings() {
  settingsDialog.value = null;
  if (currentEditingNote.value) {
    await saveNote(currentEditingNote.value);
  }
  currentEditingNote.value = null;
}

async function changeColor(hex) {
  if (!currentEditingNote.value) return;
  currentEditingNote.value.color = hex;
  await saveNote(currentEditingNote.value);
}

async function changeFontSize(size) {
  if (!currentEditingNote.value) return;
  currentEditingNote.value.fontSize = size;
  await saveNote(currentEditingNote.value);
}

async function changeOpacity(opacity) {
  if (!currentEditingNote.value) return;
  currentEditingNote.value.opacity = opacity / 100;
  await saveNote(currentEditingNote.value);
}

async function changeTitle(title) {
  if (!currentEditingNote.value) return;
  currentEditingNote.value.title = title;
  await saveNote(currentEditingNote.value);
}

async function minimizeWindow() {
  const win = getCurrentWindow();
  await win.minimize();
}

async function closeWindow() {
  const win = getCurrentWindow();
  await win.hide();
}

async function startDrag(note, event) {
  if (event.target.closest(".title-btn") || event.target.closest(".text-content")) return;
  const win = getCurrentWindow();
  await win.startDragging();
}

async function resizeWindow(note, event) {
  event.stopPropagation();
  const win = getCurrentWindow();
  const size = await win.innerSize();
  const minWidth = 180;
  const minHeight = 100;

  const newWidth = Math.max(minWidth, size.width + event.detail.dx);
  const newHeight = Math.max(minHeight, size.height + event.detail.dy);

  await win.setSize({ width: newWidth, height: newHeight });
  note.width = newWidth;
  note.height = newHeight;
  clearTimeout(note.saveTimer);
  note.saveTimer = setTimeout(async () => {
    await saveNote(note);
  }, 800);
}

async function hideNote(note) {
  note.visible = false;
  await saveNote(note);
}

async function showAll() {
  const win = getCurrentWindow();
  await win.show();
  await win.setFocus();
  notes.value.forEach((n) => (n.visible = true));
}

async function hideAll() {
  notes.value.forEach((n) => (n.visible = false));
}
</script>

<template>
  <div class="app-container" @click="closeSettings">
    <div class="notes-area">
      <div
        v-for="note in notes"
        :key="note.id"
        class="note-window"
        :class="{ hidden: !note.visible }"
        :style="{
          backgroundColor: note.color,
          left: note.x + 'px',
          top: note.y + 'px',
          width: note.width + 'px',
          height: note.height + 'px',
          opacity: note.opacity,
        }"
        @mousedown="(e) => startDrag(note, e)"
      >
        <!-- Title Bar -->
        <div class="title-bar">
          <button
            class="title-btn pin-btn"
            :class="{ pinned: note.isAlwaysOnTop }"
            @click.stop="togglePin(note)"
            :title="note.isAlwaysOnTop ? '取消置顶' : '置顶'"
          >
            {{ note.isAlwaysOnTop ? "📌" : "○" }}
          </button>

          <span class="title-text" @dblclick.stop="openSettings(note)">{{ note.title }}</span>

          <div class="title-actions">
            <button class="title-btn" @click.stop="openSettings(note)" title="设置">⋮</button>
            <button class="title-btn" @click.stop="hideNote(note)" title="最小化">−</button>
            <button class="title-btn delete-btn" @click.stop="deleteNote(note)" title="删除">🗑</button>
            <button class="title-btn" @click.stop="closeWindow" title="关闭">×</button>
          </div>
        </div>

        <!-- Text Content -->
        <textarea
          class="text-content"
          v-model="note.content"
          placeholder="输入内容..."
          :style="{ fontSize: note.fontSize + 'px' }"
          @input="updateNote(note)"
        ></textarea>

        <!-- Resize Grip -->
        <div class="resize-grip" @mousedown.stop="resizeWindow(note, $event)"></div>
      </div>
    </div>

    <!-- Settings Dialog -->
    <div
      v-if="settingsDialog === 'settings' && currentEditingNote"
      class="settings-overlay"
      @click.stop="closeSettings"
    >
      <div class="settings-dialog" @click.stop>
        <h3>设置</h3>

        <div class="setting-row">
          <label>标题</label>
          <input
            type="text"
            :value="currentEditingNote.title"
            @change="changeTitle($event.target.value)"
          />
        </div>

        <div class="setting-row">
          <label>不透明度</label>
          <input
            type="range"
            min="30"
            max="100"
            :value="currentEditingNote.opacity * 100"
            @input="changeOpacity(parseInt($event.target.value))"
          />
          <span>{{ Math.round(currentEditingNote.opacity * 100) }}%</span>
        </div>

        <div class="setting-row">
          <label>字体大小</label>
          <input
            type="number"
            min="8"
            max="30"
            :value="currentEditingNote.fontSize"
            @change="changeFontSize(parseInt($event.target.value))"
          />
        </div>

        <div class="setting-row">
          <label>置顶</label>
          <input
            type="checkbox"
            :checked="currentEditingNote.isAlwaysOnTop"
            @change="togglePin(currentEditingNote)"
          />
        </div>

        <div class="setting-row">
          <label>颜色</label>
          <div class="color-buttons">
            <button
              v-for="c in colors"
              :key="c.hex"
              class="color-btn"
              :class="{ active: currentEditingNote.color === c.hex }"
              :style="{ backgroundColor: c.hex }"
              @click="changeColor(c.hex)"
            >
              {{ c.name }}
            </button>
          </div>
        </div>

        <button class="close-settings-btn" @click="closeSettings">确定</button>
      </div>
    </div>

    <!-- System Tray Menu (simulated) -->
    <div class="tray-hint">
      <button @click="createNote" title="新建便签">+ 新建</button>
      <button @click="showAll" title="显示全部">👁 显示</button>
      <button @click="hideAll" title="隐藏全部">👁 隐藏</button>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  background: transparent;
  overflow: hidden;
}

.app-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: transparent;
}

.notes-area {
  position: relative;
  width: 100%;
  height: 100%;
}

.note-window {
  position: absolute;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: opacity 0.2s;
}

.note-window.hidden {
  opacity: 0 !important;
  pointer-events: none;
}

.title-bar {
  display: flex;
  align-items: center;
  height: 20px;
  padding: 0 2px;
  background: transparent;
  user-select: none;
}

.title-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: #333;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  padding: 0;
}

.title-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.pin-btn.pinned {
  background: rgba(0, 0, 0, 0.1);
}

.title-text {
  flex: 1;
  text-align: center;
  font-size: 12px;
  font-weight: bold;
  color: #222;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title-actions {
  display: flex;
  gap: 1px;
}

.delete-btn:hover {
  background: rgba(255, 0, 0, 0.2) !important;
}

.text-content {
  flex: 1;
  background: rgba(255, 255, 255, 0.35);
  border: none;
  padding: 2px 4px;
  font-family: "Microsoft YaHei", "Segoe UI", Arial, sans-serif;
  color: #111;
  resize: none;
  outline: none;
  line-height: 1.4;
}

.text-content::placeholder {
  color: #666;
}

.resize-grip {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 2px;
  cursor: se-resize;
}

.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.settings-dialog {
  background: white;
  border-radius: 8px;
  padding: 16px;
  width: 260px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.settings-dialog h3 {
  margin-bottom: 12px;
  font-size: 14px;
  color: #333;
}

.setting-row {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-row label {
  font-size: 12px;
  color: #555;
  min-width: 60px;
}

.setting-row input[type="text"],
.setting-row input[type="number"] {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 12px;
}

.setting-row input[type="range"] {
  flex: 1;
}

.setting-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.color-buttons {
  display: flex;
  gap: 4px;
}

.color-btn {
  width: 36px;
  height: 24px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 10px;
  cursor: pointer;
  color: #333;
}

.color-btn.active {
  border: 2px solid #333;
}

.close-settings-btn {
  width: 100%;
  margin-top: 12px;
  padding: 8px;
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.close-settings-btn:hover {
  background: #e0e0e0;
}

.tray-hint {
  position: fixed;
  bottom: 10px;
  right: 10px;
  display: flex;
  gap: 8px;
  z-index: 999;
}

.tray-hint button {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.tray-hint button:hover {
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>
