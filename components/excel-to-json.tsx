"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bold,
  CheckCircle2,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Send,
  Strikethrough,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useRef, useState } from "react";
import readXlsxFile from "read-excel-file/browser";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.email();

const composeSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200, "Subject must be under 200 characters"),
  body: z.string().min(1, "Email body is required").max(50000, "Body is too long"),
});

type ComposeErrors = Partial<Record<keyof z.infer<typeof composeSchema>, string>>;

type ValidationError = {
  row: number;
  dataIndex: number;
  column: string;
  value: string;
  message: string;
};

type RecipientRow = Record<string, unknown>;

// Extra emails added manually per error row: key = `${dataIndex}-${column}`
type ExtraEmails = Record<string, string[]>;

export default function ExcelToJson() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [converting, setConverting] = useState(false);
  const [sending, setSending] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [rawData, setRawData] = useState<RecipientRow[]>([]);
  const [emailColumns, setEmailColumns] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [sentSuccess, setSentSuccess] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [composeErrors, setComposeErrors] = useState<ComposeErrors>({});
  // tracks rows removed from the error list
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());
  // tracks extra emails added per error row
  const [extraEmails, setExtraEmails] = useState<ExtraEmails>({});
  // tracks new email input value per error row
  const [newEmailInputs, setNewEmailInputs] = useState<Record<string, string>>({});

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Placeholder.configure({ placeholder: "Write your email body here..." })],
    content: "",
    onUpdate: ({ editor }) => {
      const text = editor.getText().trim();
      if (text) setComposeErrors((prev) => ({ ...prev, body: undefined }));
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setRawData([]);
      setValidationErrors([]);
      setEditedValues({});
      setSentSuccess(false);
      setComposeErrors({});
      setRemovedKeys(new Set());
      setExtraEmails({});
      setNewEmailInputs({});
    }
  };

  const detectEmailColumns = (headers: string[]): string[] => headers.filter((h) => /email/i.test(h));

  const validateEmails = (result: RecipientRow[], cols: string[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    result.forEach((row, dataIndex) => {
      cols.forEach((col) => {
        const value = String(row[col] ?? "").trim();
        if (!emailSchema.safeParse(value).success) {
          errors.push({ row: dataIndex + 2, dataIndex, column: col, value, message: "Invalid Email Format" });
        }
      });
    });
    return errors;
  };

  const handleConvert = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setConverting(true);
    setValidationErrors([]);
    setRawData([]);
    setEditedValues({});
    setRemovedKeys(new Set());
    setExtraEmails({});
    setNewEmailInputs({});
    setSentSuccess(false);

    try {
      const data = await readXlsxFile(file);
      const headers = data[0] as string[];
      const result = data.slice(1).map((row) => Object.fromEntries(headers.map((header, i) => [header, row[i]])));

      const cols = detectEmailColumns(headers);
      setEmailColumns(cols);
      setRawData(result);

      const errors = cols.length > 0 ? validateEmails(result, cols) : [];
      setValidationErrors(errors);
    } catch {
      alert("Error reading file. Ensure it is a valid Excel document.");
    } finally {
      setConverting(false);
    }
  };

  const handleEmailEdit = (dataIndex: number, column: string, newValue: string) => {
    const key = `${dataIndex}-${column}`;
    setEditedValues((prev) => ({ ...prev, [key]: newValue }));
  };

  // Remove the invalid row entirely — clears it from rawData
  const handleRemoveRow = (dataIndex: number, column: string) => {
    const key = `${dataIndex}-${column}`;
    setRemovedKeys((prev) => new Set([...prev, key]));
    // Also clear any edits/extras for this row
    setEditedValues((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });
    setExtraEmails((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });
    setNewEmailInputs((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });
  };

  // Add a new valid email to the extras list for this row
  const handleAddEmail = (dataIndex: number, column: string) => {
    const key = `${dataIndex}-${column}`;
    const newEmail = (newEmailInputs[key] ?? "").trim();
    if (!emailSchema.safeParse(newEmail).success) return;

    setExtraEmails((prev) => ({
      ...prev,
      [key]: [...(prev[key] ?? []), newEmail],
    }));
    setNewEmailInputs((prev) => ({ ...prev, [key]: "" }));
  };

  const handleRemoveExtraEmail = (key: string, index: number) => {
    setExtraEmails((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleApplyFixes = () => {
    const updated = rawData
      .map((row, dataIndex) => {
        const updatedRow = { ...row };
        emailColumns.forEach((col) => {
          const key = `${dataIndex}-${col}`;
          if (removedKeys.has(key)) return; // will be filtered below
          if (editedValues[key] !== undefined) updatedRow[col] = editedValues[key];
        });
        return updatedRow;
      })
      .filter((_, dataIndex) => {
        // Remove rows where ALL email columns are removed
        return !emailColumns.every((col) => removedKeys.has(`${dataIndex}-${col}`));
      });

    setRawData(updated);
    setEditedValues({});
    setRemovedKeys(new Set());
    setValidationErrors(validateEmails(updated, emailColumns));
  };

  // Build the final resolved data (applying edits, skipping removed rows)
  const resolvedData = rawData
    .map((row, dataIndex) => {
      const updatedRow = { ...row };
      emailColumns.forEach((col) => {
        const key = `${dataIndex}-${col}`;
        if (editedValues[key] !== undefined) updatedRow[col] = editedValues[key];
      });
      return { row: updatedRow, dataIndex };
    })
    .filter(({ dataIndex }) => !emailColumns.every((col) => removedKeys.has(`${dataIndex}-${col}`)))
    .map(({ row }) => row);

  // Collect all valid emails: from resolvedData + extra emails added manually
  const validEmailList = [
    ...resolvedData.flatMap((row) => emailColumns.map((col) => String(row[col] ?? "").trim()).filter(Boolean)),
    ...Object.values(extraEmails).flat(),
  ];

  // Active errors = validation errors minus removed keys
  const activeErrors = validationErrors.filter((err) => !removedKeys.has(`${err.dataIndex}-${err.column}`));

  const hasErrors = activeErrors.length > 0;
  const hasPendingEdits = Object.keys(editedValues).length > 0 || removedKeys.size > 0;
  const isReadyToSend = rawData.length > 0 && !hasErrors;

  const resetState = () => {
    setFileName("");
    setRawData([]);
    setValidationErrors([]);
    setEditedValues({});
    setRemovedKeys(new Set());
    setExtraEmails({});
    setNewEmailInputs({});
    setEmailColumns([]);
    setSubject("");
    setSentSuccess(false);
    setComposeErrors({});
    editor?.commands.clearContent();
    // reset the file input so the same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    const bodyText = editor?.getText().trim() ?? "";
    const bodyHtml = editor?.getHTML() ?? "";

    const result = composeSchema.safeParse({ subject: subject.trim(), body: bodyText });
    if (!result.success) {
      const fieldErrors: ComposeErrors = {};
      result.error.issues.forEach((e) => {
        const field = e.path[0] as keyof ComposeErrors;
        fieldErrors[field] = e.message;
      });
      setComposeErrors(fieldErrors);
      return;
    }

    if (validEmailList.length === 0) return alert("No valid recipients found.");

    setComposeErrors({});
    setSending(true);

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: resolvedData,
          subject: subject.trim(),
          body: bodyHtml,
        }),
      });

      if (!response.ok) throw new Error("Server error");

      setSentSuccess(true);

      toast.success("Emails sent successfully!", {
        description: `${validEmailList.length} recipient${validEmailList.length !== 1 ? "s" : ""} will receive the email shortly.`,
        duration: 4000,
      });

      // Reset all state after 1 second
      setTimeout(resetState, 1000);
    } catch {
      toast.error("Failed to send emails", {
        description: "Please check your connection and try again.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=JetBrains+Mono&display=swap");

        .mailer-root {
          font-family: "Poppins", sans-serif;
        }

        .pill-input {
          border-radius: calc(0.25rem /* 4px */ + 4px);
          border: 1.5px solid #e2e8f0 !important;
          background: #fcfdfe !important;
          padding-left: 1.5rem !important;
          font-size: 1rem !important;
          height: 3.5rem !important;
          transition: all 0.2s ease;
        }

        .pill-input:focus {
          border-color: #3b82f6 !important;
          background: white !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12) !important;
        }

        .pill-panel {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: calc(0.25rem + 4px);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.05);
        }

        .pill-file-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          height: 4rem;
          border-radius: calc(0.25rem + 4px);
          border: 2px dashed #cbd5e1;
          background: #f8faff;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 600;
        }

        .pill-file-label:hover {
          background: #f0f7ff;
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .pill-action-btn {
          height: 3.5rem;
          border-radius: calc(0.25rem + 4px);
          font-weight: 700 !important;
          transition: all 0.2s ease !important;
        }

        .error-list {
          max-height: 320px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #fca5a5 transparent;
        }

        .tiptap-toolbar {
          display: flex;
          gap: 4px;
          padding: 8px 12px;
          background: #f8faff;
          border: 1.5px solid #e2e8f0;
          border-bottom: none;
          border-radius: 16px 16px 0 0;
        }

        .tiptap-toolbar button {
          padding: 6px 8px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
        }

        .tiptap-toolbar button:hover {
          background: #e0ecff;
          color: #3b82f6;
        }
        .tiptap-toolbar button.is-active {
          background: #dbeafe;
          color: #2563eb;
        }

        .tiptap-editor {
          border: 1.5px solid #e2e8f0;
          border-radius: 0 0 16px 16px;
          padding: 1rem 1.25rem;
          min-height: 180px;
          font-size: 0.9rem;
          color: #1e293b;
          outline: none;
          transition: border-color 0.2s;
          cursor: text;
        }

        .tiptap-editor.has-error {
          border-color: #fca5a5;
        }

        .tiptap-editor:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.05);
        }

        .tiptap-editor:focus-within.has-error {
          border-color: #f87171;
          box-shadow: 0 0 0 4px rgba(248, 113, 113, 0.08);
        }

        .tiptap-editor .tiptap {
          outline: none;
          min-height: 140px;
        }

        .tiptap-editor p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
          float: left;
          height: 0;
        }

        .tiptap-editor ul,
        .tiptap-editor ol {
          padding-left: 1.25rem;
        }

        .field-error {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.75rem;
          color: #ef4444;
          font-weight: 600;
          margin-top: 5px;
        }
      `}</style>

      <div className="mailer-root w-full mx-auto py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pill-panel p-8 md:p-10 space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <Mail className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Bulk Email Sender</h2>
              <p className="text-sm font-semibold text-blue-500 uppercase tracking-widest">Upload · Validate · Send</p>
            </div>
          </div>

          {/* Step 1 */}
          <div className="space-y-3">
            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Step 1 — Upload Recipients
            </Label>
            <input
              type="file"
              accept=".xlsx, .xls"
              ref={fileInputRef}
              className="hidden"
              id="excel_file"
              onChange={handleFileChange}
            />
            <label htmlFor="excel_file" className="pill-file-label">
              {fileName ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="truncate max-w-xs">{fileName}</span>
                </div>
              ) : (
                <>
                  <UploadCloud className="h-6 w-6" />
                  <span>Choose Excel File (.xlsx / .xls)</span>
                </>
              )}
            </label>
            <Button
              onClick={handleConvert}
              disabled={!fileName || converting}
              className="pill-action-btn w-full bg-blue-600 hover:bg-blue-700 text-white">
              {converting ? <Loader2 className="animate-spin h-5 w-5" /> : "Validate Recipients"}
            </Button>
          </div>

          {/* Validation Errors */}
          <AnimatePresence>
            {hasErrors && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-black uppercase tracking-widest">
                      {activeErrors.length} Email {activeErrors.length === 1 ? "Issue" : "Issues"} — Fix below
                    </span>
                  </div>
                  {hasPendingEdits && (
                    <button
                      onClick={handleApplyFixes}
                      className="text-sm font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-2xl px-3 py-1 hover:bg-blue-100 transition">
                      Re-validate
                    </button>
                  )}
                </div>

                <ul className="error-list space-y-2">
                  {activeErrors.map((err) => {
                    const key = `${err.dataIndex}-${err.column}`;
                    const currentValue = editedValues[key] ?? err.value;
                    const isFixed = emailSchema.safeParse(currentValue).success;
                    const extras = extraEmails[key] ?? [];
                    const newInput = newEmailInputs[key] ?? "";
                    const newInputValid = emailSchema.safeParse(newInput.trim()).success;

                    return (
                      <li
                        key={key}
                        className={`rounded-xl px-3 py-2.5 space-y-2 border transition-colors ${
                          isFixed ? "bg-green-50 border-green-200" : "bg-red-100 border-red-200"
                        }`}>
                        {/* Row header */}
                        <div className="flex items-center gap-2">
                          {isFixed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          ) : (
                            <Pencil className="h-3.5 w-3.5 text-red-400 shrink-0" />
                          )}
                          <span className="font-mono text-sm font-bold text-slate-500">
                            Row {err.row} · {err.column}
                          </span>
                          {isFixed && (
                            <span className="text-xs text-green-600 font-semibold ml-auto">Looks good ✓</span>
                          )}
                          {/* Remove row button */}
                          <button
                            onClick={() => handleRemoveRow(err.dataIndex, err.column)}
                            className="ml-auto p-1 rounded-lg text-red-400 hover:bg-red-200 hover:text-red-600 transition"
                            title="Remove this recipient">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Edit existing invalid email */}
                        <Input
                          value={currentValue}
                          onChange={(e) => handleEmailEdit(err.dataIndex, err.column, e.target.value)}
                          placeholder="Correct the email address..."
                          className={`h-8 text-sm font-mono rounded-lg border transition-colors ${
                            isFixed
                              ? "border-green-300 bg-white focus:border-green-400"
                              : "border-red-300 bg-white focus:border-red-400"
                          }`}
                        />

                        {/* Extra emails added */}
                        {extras.length > 0 && (
                          <ul className="space-y-1">
                            {extras.map((email, i) => (
                              <li
                                key={i}
                                className="flex items-center gap-2 bg-green-100 border border-green-200 rounded-lg px-2.5 py-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                <span className="font-mono text-xs text-green-800 flex-1 truncate">{email}</span>
                                <button
                                  onClick={() => handleRemoveExtraEmail(key, i)}
                                  className="text-green-400 hover:text-red-500 transition"
                                  title="Remove">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Add new email input */}
                        <div className="flex gap-2">
                          <Input
                            value={newInput}
                            onChange={(e) => setNewEmailInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddEmail(err.dataIndex, err.column);
                            }}
                            placeholder="Add another email for this row..."
                            className={`h-8 text-xs font-mono rounded-lg border flex-1 transition-colors ${
                              newInput && !newInputValid
                                ? "border-red-300 focus:border-red-400"
                                : "border-slate-200 focus:border-blue-400"
                            }`}
                          />
                          <button
                            onClick={() => handleAddEmail(err.dataIndex, err.column)}
                            disabled={!newInputValid}
                            className="h-8 px-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            title="Add email">
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {hasPendingEdits && (
                  <Button
                    onClick={handleApplyFixes}
                    className="w-full rounded-full h-10 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white">
                    Apply Fixes &amp; Re-validate
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Valid Recipients Badge */}
          <AnimatePresence>
            {isReadyToSend && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <span className="text-sm font-semibold text-green-700">
                  {validEmailList.length} valid recipient
                  {validEmailList.length !== 1 ? "s" : ""} ready to receive email
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 2: Compose */}
          <AnimatePresence>
            {isReadyToSend && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Step 2 — Compose Email
                  </Label>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-600">Subject</Label>
                    <Input
                      placeholder="Enter email subject..."
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value);
                        if (e.target.value.trim()) setComposeErrors((prev) => ({ ...prev, subject: undefined }));
                      }}
                      className={`pill-input ${
                        composeErrors.subject
                          ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                          : "border-slate-200 focus:border-blue-400 focus:ring-blue-100"
                      }`}
                    />
                    <AnimatePresence>
                      {composeErrors.subject && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="field-error">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {composeErrors.subject}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-600">Body</Label>
                    <div className="tiptap-toolbar">
                      <button
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        className={editor?.isActive("bold") ? "is-active" : ""}
                        title="Bold">
                        <Bold className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        className={editor?.isActive("italic") ? "is-active" : ""}
                        title="Italic">
                        <Italic className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => editor?.chain().focus().toggleStrike().run()}
                        className={editor?.isActive("strike") ? "is-active" : ""}
                        title="Strikethrough">
                        <Strikethrough className="h-4 w-4" />
                      </button>
                      <div className="w-px bg-slate-200 mx-1" />
                      <button
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        className={editor?.isActive("bulletList") ? "is-active" : ""}
                        title="Bullet List">
                        <List className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                        className={editor?.isActive("orderedList") ? "is-active" : ""}
                        title="Ordered List">
                        <ListOrdered className="h-4 w-4" />
                      </button>
                    </div>
                    <div className={`tiptap-editor ${composeErrors.body ? "has-error" : ""}`}>
                      <EditorContent editor={editor} />
                    </div>
                    <AnimatePresence>
                      {composeErrors.body && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="field-error">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {composeErrors.body}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <Button
                  onClick={handleSend}
                  disabled={sending || sentSuccess}
                  className="pill-action-btn w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {sending ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : sentSuccess ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" /> Emails Sent!
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      Send to {validEmailList.length} Recipient{validEmailList.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
