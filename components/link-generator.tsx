"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Check, ChevronDown, Copy, Loader2, Send, X, Zap } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ENTITY_SLUGS, entity_list } from "@/lib/constants";
import { type HistoryEntry } from "@/lib/history";
import Image from "next/image";

const formSchema = z.object({
  entityId: z.string().min(1, "Required"),
  orgName: z.string().min(1, "Required"),
  selectedJobIds: z.array(z.string()).min(1, "Select at least one job"),
});

interface Job {
  id: number;
  position_name: string;
}

interface GeneratedJob {
  jobId: string;
  jobTitle: string;
  urls: HistoryEntry["urls"];
}

const PLATFORMS = [
  { key: "geg", label: "GEG", color: "bg-blue-50 text-blue-600 border-blue-100" },
  { key: "indeed", label: "Indeed", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  { key: "myCareers", label: "MyCareers", color: "bg-cyan-50 text-cyan-600 border-cyan-100" },
] as const;

function LinkGenerator() {
  const [generatedJobs, setGeneratedJobs] = React.useState<GeneratedJob[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = React.useState(true);
  const [isCopied, setIsCopied] = React.useState<string | null>(null);
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [isSent, setIsSent] = React.useState(false);
  const [isJobSelectOpen, setIsJobSelectOpen] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { entityId: "", orgName: "", selectedJobIds: [] },
  });

  const selectedEntityId = form.watch("entityId");
  const selectedJobIds = form.watch("selectedJobIds");

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
    form.setValue("selectedJobIds", []);
  }, [selectedEntityId, form]);

  function onGenerate(values: z.infer<typeof formSchema>) {
    const { selectedJobIds } = values;
    const baseUrl = "https://careers.hfse.edu.sg/jobs";

    const results = selectedJobIds.map((jobId) => {
      const job = jobs.find((j) => j.id.toString() === jobId);
      return {
        jobId,
        jobTitle: job?.position_name || "Unknown Job",
        urls: {
          geg: `${baseUrl}/${jobId}/apply`,
          indeed: `${baseUrl}/${jobId}/apply?job-portal=1`,
          myCareers: `${baseUrl}/${jobId}/apply?job-portal=2481`,
        },
      };
    });

    setGeneratedJobs(results);
    setIsSent(false);
  }

  async function onSendLinks() {
    if (generatedJobs.length === 0) return;

    setIsSending(true);
    try {
      const orgName = form.getValues("orgName");

      // Send all jobs in parallel
      await Promise.all(
        generatedJobs.map((job) =>
          fetch("/api/send-links", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobTitle: job.jobTitle,
              orgName,
              jobId: job.jobId,
              gegUrl: job.urls.geg,
              indeedUrl: job.urls.indeed,
              myCareersUrl: job.urls.myCareers,
            }),
          }),
        ),
      );

      setIsSent(true);

      form.reset({ entityId: "", orgName: "", selectedJobIds: [] });
      setJobs([]);

      setTimeout(() => {
        setGeneratedJobs([]);
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

  const isFormReady = !!form.watch("orgName") && selectedJobIds.length > 0;

  return (
    <>
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
              <FormField
                control={form.control}
                name="selectedJobIds"
                render={({ field }) => (
                  <FormItem className="relative sm:col-span-2">
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">
                      Select Active Jobs
                    </FormLabel>
                    <div className="relative">
                      <div
                        onClick={() => !(!selectedEntityId || isLoadingJobs) && setIsJobSelectOpen(!isJobSelectOpen)}
                        className={`w-full pill-select-trigger flex items-center justify-between cursor-pointer ${
                          !selectedEntityId || isLoadingJobs ? "opacity-50 cursor-not-allowed" : ""
                        }`}>
                        <div className="flex flex-wrap gap-2 items-center py-1 overflow-hidden">
                          {field.value.length > 0 ? (
                            field.value.map((id) => {
                              const job = jobs.find((j) => j.id.toString() === id);
                              return (
                                <Badge
                                  key={id}
                                  variant="secondary"
                                  className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-2 py-0.5 flex items-center gap-1">
                                  <span className="max-w-37.5 truncate">{job?.position_name || id}</span>
                                  <X
                                    className="h-3 w-3 cursor-pointer hover:text-blue-900"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      field.onChange(field.value.filter((v) => v !== id));
                                    }}
                                  />
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-slate-400">
                              {isLoadingJobs
                                ? "Loading jobs..."
                                : selectedEntityId
                                  ? "Select one or more jobs"
                                  : "Select organization first"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 pr-2">
                          {isLoadingJobs && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                          <ChevronDown
                            className={`h-4 w-4 text-slate-400 transition-transform ${isJobSelectOpen ? "rotate-180" : ""}`}
                          />
                        </div>
                      </div>

                      <AnimatePresence>
                        {isJobSelectOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsJobSelectOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute bottom-full left-0 right-0 z-50 mt-2 pill-select-content max-h-80 overflow-y-auto bg-white border border-slate-200 shadow-2xl rounded-xl custom-scrollbar">
                              {jobs.length > 0 ? (
                                <div className="p-2 space-y-1">
                                  {jobs.map((job) => {
                                    const isSelected = field.value.includes(job.id.toString());
                                    return (
                                      <div
                                        key={job.id}
                                        onClick={() => {
                                          const newValue = isSelected
                                            ? field.value.filter((id) => id !== job.id.toString())
                                            : [...field.value, job.id.toString()];
                                          field.onChange(newValue);
                                        }}
                                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                                          isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                                        }`}>
                                        <div className="flex items-center gap-3">
                                          <div
                                            className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                                              isSelected ? "bg-blue-500 border-blue-500" : "border-slate-300 bg-white"
                                            }`}>
                                            {isSelected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                                          </div>
                                          <span
                                            className={`text-sm font-semibold transition-colors ${
                                              isSelected ? "text-blue-700" : "text-slate-600"
                                            }`}>
                                            {job.position_name}
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-300 mono-text uppercase tracking-tighter">
                                          ID: {job.id}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="p-10 text-center">
                                  <Briefcase className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                                  <p className="text-sm text-slate-400 font-medium">No active jobs found</p>
                                </div>
                              )}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
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
        {generatedJobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="space-y-6">
            <div className="pill-card border-blue-100 bg-blue-50/40 p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-blue-100 pb-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500 text-white pill-badge">{generatedJobs.length} Jobs Generated</Badge>
                </div>
              </div>

              <div className="space-y-8">
                {generatedJobs.map((job, idx) => (
                  <div key={job.jobId} className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {idx + 1}
                      </div>
                      <h3 className="font-bold text-slate-700">{job.jobTitle}</h3>
                      <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-400 font-mono">
                        {job.jobId}
                      </Badge>
                    </div>

                    <div className="grid gap-3">
                      {PLATFORMS.map(({ key, label, color }) => (
                        <div
                          key={key}
                          className="flex items-center gap-4 bg-white p-2 pr-4 rounded-xl border border-blue-100 shadow-sm group hover:border-blue-300 transition-colors">
                          <Badge className={`${color} pill-badge w-24 justify-center`}>{label}</Badge>
                          <code className="flex-1 truncate mono-text text-slate-500 text-xs font-medium">
                            {job.urls[key]}
                          </code>
                          <button
                            onClick={() => copyToClipboard(job.urls[key], `${job.jobId}-${key}`)}
                            className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors">
                            {isCopied === `${job.jobId}-${key}` ? (
                              <Check className="h-5 w-5 text-emerald-500" />
                            ) : (
                              <Copy className="h-5 w-5 opacity-40 group-hover:opacity-100" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Send Button */}
              <Button onClick={onSendLinks} disabled={isSending || isSent} className="pill-btn-success w-full mt-4">
                {isSending ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : isSent ? (
                  <span className="flex items-center gap-2">
                    <Check className="h-5 w-5" /> All Links Sent!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Send All Links via Teams
                  </span>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default LinkGenerator;
