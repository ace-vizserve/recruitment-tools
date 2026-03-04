"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Check, Copy, Loader2, Send, Zap } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { entity_list } from "@/lib/constants";
import { type HistoryEntry } from "@/lib/history";
import { encodeJobTitle } from "@/lib/urlEncoder";
import Image from "next/image";

const ENTITY_SLUGS: Record<number, string> = {
  3779178: "hapi-haus",
  3779180: "hapi-space",
  3779176: "hfse-ga",
  3779172: "hfse",
  3779173: "hfse-ys",
  3779179: "our-hapi-co",
  3779177: "vizschool",
};

const formSchema = z.object({
  entityId: z.string().min(1, "Required"),
  orgName: z.string().min(1, "Required"),
  jobId: z.string().min(1, "Required"),
  jobTitle: z.string().min(1, "Required"),
});

interface Job {
  id: number;
  position_name: string;
}

const PLATFORMS = [
  { key: "geg", label: "GEG", color: "bg-blue-50 text-blue-600 border-blue-100" },
  { key: "indeed", label: "Indeed", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  { key: "myCareers", label: "MyCareers", color: "bg-cyan-50 text-cyan-600 border-cyan-100" },
] as const;

function LinkGenerator() {
  const [generatedUrls, setGeneratedUrls] = React.useState<HistoryEntry["urls"] | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = React.useState(true);
  const [isCopied, setIsCopied] = React.useState<string | null>(null);
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [isSent, setIsSent] = React.useState(false);

  // Snapshot of form values at generation time — used for sending
  const [pendingSendPayload, setPendingSendPayload] = React.useState<{
    jobTitle: string;
    orgName: string;
    jobId: string;
  } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { entityId: "", orgName: "", jobId: "", jobTitle: "" },
  });

  const selectedEntityId = form.watch("entityId");

  React.useEffect(() => {
    const timer = setTimeout(() => setIsHistoryLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (!selectedEntityId) {
      setJobs([]);
      return;
    }

    const fetchJobs = async () => {
      setIsLoadingJobs(true);
      try {
        const response = await fetch(`/api/jobs?entity-id=${selectedEntityId}`);
        if (response.ok) {
          const data = await response.json();
          setJobs(data.results || []);
        }
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
      } finally {
        setIsLoadingJobs(false);
      }
    };

    fetchJobs();
    form.setValue("jobId", "");
    form.setValue("jobTitle", "");
  }, [selectedEntityId, form]);

  // Step 1: Generate URLs only — does NOT send
  function onGenerate(values: z.infer<typeof formSchema>) {
    const { orgName, jobId, jobTitle } = values;
    const encodedTitle = encodeJobTitle(jobTitle);
    const baseUrl = "https://hfse.edu.sg/submit-application/";

    const urls = {
      geg: `${baseUrl}?job-id=${jobId}&org-name=${orgName}&job-title=${encodedTitle}`,
      indeed: `${baseUrl}?job-portal=1&job-id=${jobId}&org-name=${orgName}&job-title=${encodedTitle}`,
      myCareers: `${baseUrl}?job-portal=2481&job-id=${jobId}&org-name=${orgName}&job-title=${encodedTitle}`,
    };

    setGeneratedUrls(urls);
    setIsSent(false); // reset sent state if re-generating
    setPendingSendPayload({ jobTitle, orgName, jobId });
  }

  // Step 2: Send links — only triggered manually
  async function onSendLinks() {
    if (!generatedUrls || !pendingSendPayload) return;

    setIsSending(true);
    try {
      await fetch("/api/send-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: pendingSendPayload.jobTitle,
          orgName: pendingSendPayload.orgName,
          jobId: pendingSendPayload.jobId,
          gegUrl: generatedUrls.geg,
          indeedUrl: generatedUrls.indeed,
          myCareersUrl: generatedUrls.myCareers,
        }),
      });

      setIsSent(true);

      // Reset form after sending
      form.reset({ entityId: "", orgName: "", jobId: "", jobTitle: "" });
      setJobs([]);
      setPendingSendPayload(null);

      setTimeout(() => {
        setGeneratedUrls(null);
        setIsSent(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to send Teams notification:", error);
    } finally {
      setIsSending(false);
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(key);
      setTimeout(() => setIsCopied(null), 2000);
    });
  };

  if (isHistoryLoading) {
    return (
      <div className="flex items-center justify-center min-h-75">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
          <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Loading</p>
        </div>
      </div>
    );
  }

  const isFormReady = !!form.watch("orgName") && !!form.watch("jobTitle");

  return (
    <>
      <style jsx global>{`
        .pill-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: calc(0.25rem + 4px);
          box-shadow:
            0 10px 15px -3px rgba(0, 0, 0, 0.04),
            0 4px 6px -2px rgba(0, 0, 0, 0.02);
        }

        .pill-input {
          border-radius: calc(0.25rem + 4px);
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

        .pill-btn-primary {
          background: #3b82f6 !important;
          color: white !important;
          border-radius: calc(0.25rem + 4px);
          font-weight: 700 !important;
          font-size: 1rem !important;
          height: 3.5rem !important;
          transition: all 0.2s ease !important;
        }

        .pill-btn-primary:hover:not(:disabled) {
          background: #2563eb !important;
          transform: translateY(-2px);
          box-shadow: 0 12px 20px -5px rgba(59, 130, 246, 0.3);
        }

        .pill-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #94a3b8 !important;
        }

        .pill-btn-success {
          background: #16a34a !important;
          color: white !important;
          border-radius: calc(0.25rem + 4px);
          font-weight: 700 !important;
          font-size: 1rem !important;
          height: 3.5rem !important;
          transition: all 0.2s ease !important;
        }

        .pill-btn-success:hover:not(:disabled) {
          background: #15803d !important;
          transform: translateY(-2px);
          box-shadow: 0 12px 20px -5px rgba(22, 163, 74, 0.3);
        }

        .pill-btn-success:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pill-badge {
          border-radius: calc(0.25rem + 4px);
          font-size: 0.75rem !important;
          padding: 4px 14px !important;
          font-weight: 700 !important;
        }

        .mono-text {
          font-family: "JetBrains Mono", monospace;
          font-size: 0.85rem;
        }

        .pill-select-trigger {
          border-radius: calc(0.25rem + 4px);
          border: 1.5px solid #e2e8f0 !important;
          background: #fcfdfe !important;
          padding-left: 1.5rem !important;
          font-size: 1rem !important;
          height: 3.5rem !important;
          font-family: "Poppins", sans-serif;
          transition: all 0.2s ease;
        }

        .pill-select-trigger:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12) !important;
        }

        .pill-select-item {
          height: 3.5rem !important;
          border-radius: calc(0.25rem + 4px);
          margin: 6px 10px !important;
          padding-left: 1rem !important;
          transition: all 0.2s ease;
          font-family: "Poppins", sans-serif;
        }

        .pill-select-item:focus {
          background-color: #f0f7ff !important;
          transform: translateX(4px);
        }

        .pill-select-content {
          border-radius: calc(0.25rem + 4px);
          padding: 8px 0 !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1) !important;
        }
      `}</style>

      <div className="pill-card p-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Zap className="h-6 w-6 text-blue-500 fill-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Generate New Links</h2>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onGenerate)} className="space-y-8">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Organization */}
              <FormField
                control={form.control}
                name="entityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">
                      Organization
                    </FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue("orgName", ENTITY_SLUGS[Number(val)] || "");
                      }}
                      defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full pill-select-trigger">
                          <SelectValue placeholder="Select an organization" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="pill-select-content">
                        {entity_list.map((org) => (
                          <SelectItem key={org.id} value={org.id.toString()} className="pill-select-item">
                            <div className="flex items-center gap-4">
                              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                                <Image
                                  src={org.logo}
                                  alt={org.name}
                                  fill
                                  sizes="48px"
                                  className="object-contain p-1.5"
                                  priority={true}
                                />
                              </div>
                              <span className="text-lg font-semibold text-slate-700">{org.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Job Selection */}
              <FormItem>
                <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">
                  Select Active Job
                </FormLabel>
                <Select
                  disabled={!selectedEntityId || isLoadingJobs}
                  onValueChange={(val) => {
                    const job = jobs.find((j) => j.id.toString() === val);
                    if (job) {
                      form.setValue("jobId", job.id.toString());
                      form.setValue("jobTitle", job.position_name);
                    }
                  }}
                  value={form.watch("jobId")}>
                  <FormControl>
                    <SelectTrigger className="w-full pill-select-trigger overflow-hidden">
                      {isLoadingJobs ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          <span>Loading jobs...</span>
                        </div>
                      ) : (
                        <SelectValue placeholder={selectedEntityId ? "Select a job" : "Select organization first"} />
                      )}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="pill-select-content">
                    {jobs.length > 0 ? (
                      jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id.toString()} className="pill-select-item">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-lg">
                              <Briefcase className="h-4 w-4 text-slate-400" />
                            </div>
                            <span className="text-sm font-bold text-slate-700">{job.position_name}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-400 font-semibold">
                        {selectedEntityId ? "No active jobs found" : "Waiting for organization..."}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </FormItem>

              <FormField
                control={form.control}
                name="jobId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">
                      Job ID
                    </FormLabel>
                    <FormControl>
                      <Input className="pill-input" placeholder="Auto-filled" {...field} readOnly />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">
                      Job Title
                    </FormLabel>
                    <FormControl>
                      <Input className="pill-input" placeholder="Auto-filled" {...field} readOnly />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="pill-btn-primary w-full" disabled={!isFormReady}>
              <Zap className="mr-2 h-5 w-5" />
              Create Application Links
            </Button>
          </form>
        </Form>
      </div>

      {/* Result Section */}
      <AnimatePresence>
        {generatedUrls && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="pill-card border-blue-100 bg-blue-50/40 p-8 space-y-4">
            {/* URL List */}
            {PLATFORMS.map(({ key, label, color }) => (
              <div
                key={key}
                className="flex items-center gap-4 bg-white p-3 pr-6 rounded-xl border border-blue-100 shadow-sm">
                <Badge className={`${color} pill-badge`}>{label}</Badge>
                <code className="flex-1 truncate mono-text text-slate-600 font-medium">{generatedUrls[key]}</code>
                <button
                  onClick={() => copyToClipboard(generatedUrls[key], key)}
                  className="p-3 hover:bg-blue-50 rounded-xl text-blue-500 transition-colors">
                  {isCopied === key ? <Check className="h-6 w-6 text-emerald-500" /> : <Copy className="h-6 w-6" />}
                </button>
              </div>
            ))}

            {/* Send Button */}
            <Button onClick={onSendLinks} disabled={isSending || isSent} className="pill-btn-success w-full mt-2">
              {isSending ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : isSent ? (
                <span className="flex items-center gap-2">
                  <Check className="h-5 w-5" /> Links Sent!
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Send Links via Teams
                </span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default LinkGenerator;
