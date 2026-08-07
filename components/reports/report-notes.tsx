"use client";

import { MessageSquarePlus, Pencil, Trash2, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/reports/format";
import { deleteNote, getNotesFor, saveNote, updateNote, type ReportNote } from "@/lib/reports/notes";

interface ReportNotesProps {
  jobId: string;
  periodKey: string;
}

export default function ReportNotes({ jobId, periodKey }: ReportNotesProps) {
  const [notes, setNotes] = React.useState<ReportNote[]>([]);
  const [draft, setDraft] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState("");

  // Read after mount, never during render — localStorage is not available on
  // the server and reading it inline would break hydration.
  React.useEffect(() => {
    setNotes(getNotesFor(jobId, periodKey));
    setEditingId(null);
    setDraft("");
  }, [jobId, periodKey]);

  const handleAdd = () => {
    if (!draft.trim()) return;
    setNotes(saveNote(jobId, periodKey, draft));
    setDraft("");
    toast.success("Note added");
  };

  const handleSaveEdit = (id: string) => {
    if (!editDraft.trim()) return;
    setNotes(updateNote(jobId, periodKey, id, editDraft));
    setEditingId(null);
    toast.success("Note updated");
  };

  const handleDelete = (id: string) => {
    setNotes(deleteNote(jobId, periodKey, id));
    toast.success("Note deleted");
  };

  // With nothing written, the whole card is excluded so the exported image
  // does not carry an empty "Notes" box.
  const exportIgnore = notes.length === 0 ? "true" : undefined;

  return (
    <section className="pill-card p-8" data-export-ignore={exportIgnore}>
      <h3 className="text-xl font-extrabold tracking-tight text-slate-800">Notes &amp; commentary</h3>
      {/* This copy is chrome: it explains the tool to whoever is writing, and
          would be noise to the client reading the exported image. */}
      <p className="mt-1 text-sm font-medium text-slate-500" data-export-ignore="true">
        Context for whoever reads this report. These notes appear in the downloaded image, so write them for the
        client. Drafts are kept in this browser until you export.
      </p>

      {notes.length > 0 && (
        <ul className="mt-6 space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-5 py-4">
              {editingId === note.id ? (
                <div data-export-ignore="true">
                  <Textarea
                    value={editDraft}
                    onChange={(event) => setEditDraft(event.target.value)}
                    rows={3}
                    className="bg-white"
                  />
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => handleSaveEdit(note.id)} disabled={!editDraft.trim()}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm font-medium text-slate-700">{note.body}</p>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <span className="text-xs font-medium text-slate-400">
                      {formatDate(new Date(note.timestamp).toISOString())}
                    </span>
                    <span className="flex gap-1" data-export-ignore="true">
                      <button
                        type="button"
                        aria-label="Edit note"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditDraft(note.body);
                        }}
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete note"
                        onClick={() => handleDelete(note.id)}
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* The composer is chrome, so it stays out of the exported image. */}
      <div className="mt-6" data-export-ignore="true">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder="Add context for whoever reads this report…"
        />
        <Button onClick={handleAdd} disabled={!draft.trim()} className="pill-btn-primary mt-3">
          <MessageSquarePlus className="h-4 w-4" />
          Add note
        </Button>
      </div>
    </section>
  );
}
