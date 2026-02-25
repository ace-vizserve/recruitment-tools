"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, History, Link2, Loader2, LogOut, Sparkles, Trash2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clearHistory, deleteHistoryEntry, getHistory, saveHistoryEntry, type HistoryEntry } from "@/lib/history";
import { encodeJobTitle } from "@/lib/urlEncoder";
import Image from "next/image";

const formSchema = z.object({
  orgName: z.string().min(1, "Required"),
  jobId: z.string().min(1, "Required"),
  jobTitle: z.string().min(1, "Required"),
});

const PLATFORMS = [
  { key: "geg", label: "GEG", color: "bg-blue-50 text-blue-600 border-blue-100" },
  { key: "indeed", label: "Indeed", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  { key: "myCareers", label: "MyCareers", color: "bg-cyan-50 text-cyan-600 border-cyan-100" },
] as const;

export default function Home() {
  const router = useRouter();
  const [generatedUrls, setGeneratedUrls] = React.useState<HistoryEntry["urls"] | null>(null);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = React.useState(true);
  const [isCopied, setIsCopied] = React.useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { orgName: "", jobId: "", jobTitle: "" },
  });

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setHistory(getHistory());
      setIsHistoryLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    const { orgName, jobId, jobTitle } = values;
    const encodedTitle = encodeJobTitle(jobTitle);
    const baseUrl = "https://hfse.edu.sg/submit-application/";

    const urls = {
      geg: `${baseUrl}?job-id=${jobId}&org-name=${orgName}&job-title=${encodedTitle}`,
      indeed: `${baseUrl}?job-portal=1&job-id=${jobId}&org-name=${orgName}&job-title=${encodedTitle}`,
      myCareers: `${baseUrl}?job-portal=2481&job-id=${jobId}&org-name=${orgName}&job-title=${encodedTitle}`,
    };

    setGeneratedUrls(urls);
    setHistory(saveHistoryEntry({ orgName, jobId, jobTitle, encodedTitle, urls }));
    form.reset();
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(key);
      setTimeout(() => setIsCopied(null), 2000);
    });
  };

  if (isHistoryLoading) {
    return (
      <div className="pill-root flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          {/* Simple Blue Spinner */}
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />

          {/* Clean Poppins Text */}
          <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=JetBrains+Mono&display=swap");

        .pill-root {
          font-family: "Poppins", sans-serif;
          background: #f8faff;
          background-image:
            radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.08) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(6, 182, 212, 0.08) 0px, transparent 50%);
          min-height: 100vh;
        }

        .pill-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: calc(0.25rem /* 4px */ + 4px);
          box-shadow:
            0 10px 15px -3px rgba(0, 0, 0, 0.04),
            0 4px 6px -2px rgba(0, 0, 0, 0.02);
        }

        .pill-input {
          border-radius: calc(0.25rem /* 4px */ + 4px);
          border: 1.5px solid #e2e8f0 !important;
          background: #fcfdfe !important;
          padding-left: 1.5rem !important;
          font-size: 1rem !important; /* Larger text */
          height: 3.5rem !important; /* Taller input */
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
          border-radius: calc(0.25rem /* 4px */ + 4px);
          font-weight: 700 !important;
          font-size: 1rem !important;
          height: 3.5rem !important;
          transition: all 0.2s ease !important;
        }

        .pill-btn-primary:hover {
          background: #2563eb !important;
          transform: translateY(-2px);
          box-shadow: 0 12px 20px -5px rgba(59, 130, 246, 0.3);
        }

        .pill-badge {
          border-radius: calc(0.25rem /* 4px */ + 4px);
          font-size: 0.75rem !important;
          padding: 4px 14px !important;
          font-weight: 700 !important;
        }

        .mono-text {
          font-family: "JetBrains Mono", monospace;
          font-size: 0.85rem; /* Larger mono text */
        }

        /* Update these in your existing global style block */
        .pill-select-trigger {
          border-radius: calc(0.25rem /* 4px */ + 4px);
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

        /* Update your global styles to accommodate the larger row height */
        .pill-select-item {
          height: 3.5rem !important; /* Increased from 3rem to fit h-12 images */
          border-radius: calc(0.25rem /* 4px */ + 4px);
          margin: 6px 10px !important;
          padding-left: 1rem !important;
          transition: all 0.2s ease;
          font-family: "Poppins", sans-serif;
        }

        .pill-select-item:focus {
          background-color: #f0f7ff !important;
          transform: translateX(4px); /* Subtle slide effect on hover/focus */
        }

        .pill-select-content {
          border-radius: calc(0.25rem /* 4px */ + 4px);
          padding: 8px 0 !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1) !important;
        }
      `}</style>

      <div className="pill-root pb-24 pt-16">
        <div className="mx-auto max-w-5xl px-6">
          {/* Header */}
          <header className="mb-12 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xl shadow-blue-200">
                <Link2 className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Generate Links for Job Postings
                </h1>
                <p className="text-sm font-bold text-blue-500 uppercase tracking-widest">HFSE Internal Tools</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="group flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-sm">
              <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Logout
            </button>
          </header>

          <div className="space-y-8">
            {/* Generator Card */}
            <div className="pill-card p-10">
              <div className="mb-8 flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Zap className="h-6 w-6 text-blue-500 fill-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Generate New Links</h2>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="orgName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">
                            Organization
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full pill-select-trigger">
                                <SelectValue placeholder="Select an organization" />
                              </SelectTrigger>
                            </FormControl>

                            <SelectContent className="pill-select-content">
                              {[
                                { name: "HAPI HAUS", value: "hapi-haus", img: "/logos/hapi-haus-logo.png" },
                                { name: "HAPI SPACE", value: "hapi-space", img: "/logos/hapi-space-logo.png" },
                                {
                                  name: "HFSE Global Academy",
                                  value: "hfse-ga",
                                  img: "/logos/hfse-global-academy-logo.png",
                                },
                                { name: "HFSE International School", value: "hfse", img: "/logos/hfse-logo.png" },
                                { name: "HFSE YoungStarters", value: "hfse-ys", img: "/logos/ys-logo.png" },
                                { name: "Our HAPI Co.", value: "our-hapi-co", img: "/logos/hapi-co-logo.png" },
                                { name: "VizSchool", value: "vizschool", img: "/logos/vizschool-logo.png" },
                              ].map((org) => (
                                <SelectItem key={org.name} value={org.value} className="pill-select-item">
                                  <div className="flex items-center gap-4">
                                    {/* Larger Image Container */}
                                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                                      <Image
                                        src={org.img}
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
                    <FormField
                      control={form.control}
                      name="jobId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">
                            Job ID
                          </FormLabel>
                          <FormControl>
                            <Input className="pill-input" placeholder="e.g. 10234" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">
                            Job Title
                          </FormLabel>
                          <FormControl>
                            <Input className="pill-input" placeholder="e.g. Senior Software Engineer" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" className="pill-btn-primary w-full">
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
                  className="pill-card border-blue-100 bg-blue-50/40 p-8 space-y-4">
                  {PLATFORMS.map(({ key, label, color }) => (
                    <div
                      key={key}
                      className="flex items-center gap-4 bg-white p-3 pr-6 rounded-xl border border-blue-100 shadow-sm">
                      <Badge className={`${color} pill-badge`}>{label}</Badge>
                      <code className="flex-1 truncate mono-text text-slate-600 font-medium">{generatedUrls[key]}</code>
                      <button
                        onClick={() => copyToClipboard(generatedUrls[key], key)}
                        className="p-3 hover:bg-blue-50 rounded-xl text-blue-500 transition-colors">
                        {isCopied === key ? (
                          <Check className="h-6 w-6 text-emerald-500" />
                        ) : (
                          <Copy className="h-6 w-6" />
                        )}
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* History Section */}
            <section className="pt-6">
              <div className="flex items-center justify-between mb-6 px-4">
                <div className="flex items-center gap-3">
                  <History className="h-5 w-5 text-slate-400" />
                  <span className="text-lg font-bold text-slate-700">Recent History</span>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={() => setHistory(clearHistory())}
                    className="text-sm font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider">
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="pill-card p-6 group hover:border-blue-300 transition-all hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                          <Sparkles className="h-7 w-7" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">{entry.jobTitle}</h3>
                          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                            {entry.orgName} • ID: {entry.jobId}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setHistory(deleteHistoryEntry(entry.id))}
                        className="opacity-0 group-hover:opacity-100 p-3 text-slate-300 hover:text-red-400 transition-all hover:bg-red-50 rounded-xl">
                        <Trash2 className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
