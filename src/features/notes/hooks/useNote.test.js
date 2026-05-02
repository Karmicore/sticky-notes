// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useState, useCallback } from "react";
import { useNote } from "./useNote";
import { useAutoSave } from "./useAutoSave";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args) => mockInvoke(...args) }));

const sampleNote = {
  id: 1, title: "Test", content: "hello", color: "#FFEB3B",
  x: 100, y: 100, width: 260, height: 320,
  isAlwaysOnTop: true, fontSize: 14, opacity: 1.0,
  visible: true, locked: false, collapsed: false,
  expandedHeight: 320, expandedWidth: 260,
};

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.useRealTimers(); });

// ── useNote ──

describe("useNote", () => {
  it("loads note on mount", async () => {
    mockInvoke.mockResolvedValueOnce(sampleNote);
    const { result } = renderHook(() => useNote(1));
    expect(result.current.note).toBeNull();
    await waitFor(() => expect(result.current.note).not.toBeNull());
    expect(result.current.note.id).toBe(1);
    expect(result.current.note.title).toBe("Test");
    expect(mockInvoke).toHaveBeenCalledWith("get_note", { id: 1 });
  });

  it("does not load when noteId is null", () => {
    const { result } = renderHook(() => useNote(null));
    expect(result.current.note).toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("update merges changes into note", async () => {
    mockInvoke.mockResolvedValueOnce(sampleNote);
    const { result } = renderHook(() => useNote(1));
    await waitFor(() => expect(result.current.note).not.toBeNull());

    act(() => { result.current.update({ title: "New Title" }); });
    expect(result.current.note.title).toBe("New Title");
    expect(result.current.note.content).toBe("hello");
    expect(result.current.note.color).toBe("#FFEB3B");
  });

  it("update preserves all other fields", async () => {
    mockInvoke.mockResolvedValueOnce(sampleNote);
    const { result } = renderHook(() => useNote(1));
    await waitFor(() => expect(result.current.note).not.toBeNull());

    act(() => { result.current.update({ color: "#BBDEFB" }); });
    expect(result.current.note.color).toBe("#BBDEFB");
    expect(result.current.note.id).toBe(1);
    expect(result.current.note.title).toBe("Test");
    expect(result.current.note.content).toBe("hello");
  });
});

// ── useAutoSave ──

// Helper: wraps useAutoSave with local state so `note` updates on `edit`
function useTestAutoSave(initialNote, delay) {
  const [note, setNote] = useState(initialNote);
  const update = useCallback((changes) => {
    setNote((prev) => ({ ...prev, ...changes }));
  }, []);
  const { saveNow, edit } = useAutoSave(note, update, delay);
  return { note, edit, saveNow };
}

describe("useAutoSave", () => {
  it("edit triggers auto-save after debounce", async () => {
    vi.useFakeTimers();
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useTestAutoSave(sampleNote, 800));
    mockInvoke.mockClear();

    act(() => { result.current.edit({ title: "Changed" }); });
    expect(mockInvoke).not.toHaveBeenCalledWith("save_note", expect.anything());

    act(() => { vi.advanceTimersByTime(800); });
    expect(mockInvoke).toHaveBeenCalledWith("save_note", expect.objectContaining({
      note: expect.objectContaining({ title: "Changed" }),
    }));
  });

  it("saveNow saves immediately", async () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useTestAutoSave(sampleNote, 800));
    mockInvoke.mockClear();

    act(() => { result.current.edit({ title: "Immediate" }); });
    await act(async () => { await result.current.saveNow(); });

    expect(mockInvoke).toHaveBeenCalledWith("save_note", expect.objectContaining({
      note: expect.objectContaining({ title: "Immediate" }),
    }));
  });

  it("debounce resets on new edit — only latest value saved", async () => {
    vi.useFakeTimers();
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useTestAutoSave(sampleNote, 800));
    mockInvoke.mockClear();

    act(() => { result.current.edit({ title: "First" }); });
    act(() => { vi.advanceTimersByTime(500); });
    act(() => { result.current.edit({ title: "Second" }); });
    act(() => { vi.advanceTimersByTime(800); });

    const saveCalls = mockInvoke.mock.calls.filter((c) => c[0] === "save_note");
    expect(saveCalls.length).toBe(1);
    expect(saveCalls[0][1].note.title).toBe("Second");
  });

  it("no save when no edits made", async () => {
    vi.useFakeTimers();
    mockInvoke.mockResolvedValue(undefined);
    renderHook(() => useTestAutoSave(sampleNote, 800));
    mockInvoke.mockClear();

    act(() => { vi.advanceTimersByTime(2000); });
    expect(mockInvoke).not.toHaveBeenCalledWith("save_note", expect.anything());
  });
});
