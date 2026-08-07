/**
 * Report notes, persisted in localStorage and keyed by job + period.
 *
 * Structurally mirrors lib/history.ts (module-level key, SSR guard, try/catch
 * around JSON.parse, crypto.randomUUID, mutators return the updated list). The
 * one addition is a schema version, so a future shape change can migrate
 * instead of throwing away everyone's notes.
 *
 * A single top-level key rather than one per job/period keeps "clear all"
 * possible and makes the storage footprint visible in one place.
 */

export interface ReportNote {
  id: string;
  timestamp: number;
  body: string;
}

interface NotesStore {
  v: number;
  notes: Record<string, ReportNote[]>;
}

const STORAGE_KEY = "hfse_report_notes";
const SCHEMA_VERSION = 1;

function scopeKey(jobId: string, periodKey: string): string {
  return `${jobId}:${periodKey}`;
}

function readStore(): NotesStore {
  if (typeof window === "undefined") return { v: SCHEMA_VERSION, notes: {} };

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return { v: SCHEMA_VERSION, notes: {} };

  try {
    const parsed = JSON.parse(stored) as Partial<NotesStore>;
    if (!parsed || typeof parsed !== "object" || !parsed.notes) {
      return { v: SCHEMA_VERSION, notes: {} };
    }
    return { v: parsed.v ?? SCHEMA_VERSION, notes: parsed.notes };
  } catch (error) {
    console.error("Failed to parse report notes", error);
    return { v: SCHEMA_VERSION, notes: {} };
  }
}

function writeStore(store: NotesStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    // Quota exceeded, or storage disabled in a locked-down browser.
    console.error("Failed to save report notes", error);
  }
}

export function getNotesFor(jobId: string, periodKey: string): ReportNote[] {
  return readStore().notes[scopeKey(jobId, periodKey)] ?? [];
}

export function saveNote(jobId: string, periodKey: string, body: string): ReportNote[] {
  const trimmed = body.trim();
  if (!trimmed) return getNotesFor(jobId, periodKey);

  const store = readStore();
  const key = scopeKey(jobId, periodKey);
  const note: ReportNote = { id: crypto.randomUUID(), timestamp: Date.now(), body: trimmed };
  const updated = [...(store.notes[key] ?? []), note];

  store.notes[key] = updated;
  writeStore(store);
  return updated;
}

export function updateNote(jobId: string, periodKey: string, id: string, body: string): ReportNote[] {
  const store = readStore();
  const key = scopeKey(jobId, periodKey);
  const updated = (store.notes[key] ?? []).map((note) =>
    note.id === id ? { ...note, body: body.trim() } : note,
  );

  store.notes[key] = updated;
  writeStore(store);
  return updated;
}

export function deleteNote(jobId: string, periodKey: string, id: string): ReportNote[] {
  const store = readStore();
  const key = scopeKey(jobId, periodKey);
  const updated = (store.notes[key] ?? []).filter((note) => note.id !== id);

  if (updated.length) store.notes[key] = updated;
  else delete store.notes[key];

  writeStore(store);
  return updated;
}
