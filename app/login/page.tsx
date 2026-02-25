"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Link2, Loader2, LockKeyhole, RefreshCcw, ShieldAlert, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  password: z.string().min(1, { message: "Password is required." }),
});

export default function LoginPage() {
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [isLocked, setIsLocked] = React.useState(false);

  // Set to 300 seconds (5 minutes)
  const [timeLeft, setTimeLeft] = React.useState(300);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "" },
  });

  // Timer Logic
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLocked && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsLocked(false);
      setTimeLeft(300); // Reset for potential next lockout
    }
    return () => clearInterval(interval);
  }, [isLocked, timeLeft]);

  // Helper to format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isLocked) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        router.push("/");
      } else {
        const data = await res.json();
        if (res.status === 429) {
          setIsLocked(true);
        } else {
          setError(data.error || "Invalid credentials");
        }
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap");

        .login-pill-root {
          font-family: "Poppins", sans-serif;
          background: #f8faff;
          background-image:
            radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.08) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(6, 182, 212, 0.08) 0px, transparent 50%);
          min-height: 100vh;
        }

        .login-pill-panel {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.05);
        }

        .login-pill-input {
          border-radius: calc(0.25rem /* 4px */ + 4px);
          border: 1.5px solid #e2e8f0 !important;
          background: #fcfdfe !important;
          height: 3.5rem !important;
          padding-left: 3.5rem !important;
        }

        .login-pill-btn {
          background: #3b82f6 !important;
          color: white !important;
          font-weight: 700 !important;
          height: 3.5rem !important;
          border-radius: calc(0.25rem /* 4px */ + 4px);
        }

        .timer-font {
          font-variant-numeric: tabular-nums;
        }
      `}</style>

      <div className="login-pill-root flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl">
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-3xl bg-blue-600 text-white shadow-xl flex items-center justify-center mb-6">
              <Link2 className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">MRF Job Portal</h1>
            <p className="text-xs font-black text-blue-500 uppercase tracking-[0.3em] mt-2">Security Control</p>
          </div>

          <div className="login-pill-panel p-10">
            <AnimatePresence mode="wait">
              {isLocked ? (
                /* --- LOCKED 5-MIN UI --- */
                <motion.div
                  key="locked"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center text-center space-y-8 py-4">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                      <ShieldAlert className="h-12 w-12" />
                    </div>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="absolute -inset-3 border-t-2 border-rose-200 rounded-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900">Cooldown Active</h2>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-70">
                      Access is temporarily restricted due to multiple failed attempts.
                    </p>
                  </div>

                  <div className="w-full bg-rose-50 border border-rose-100 rounded-4xl p-6 flex flex-col items-center gap-2 shadow-sm">
                    <div className="flex items-center gap-3 text-rose-600">
                      <Timer className="h-7 w-7" />
                      <span className="font-black text-4xl timer-font">{formatTime(timeLeft)}</span>
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-rose-400">
                      Resetting Access In
                    </span>
                  </div>

                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors text-[10px] font-black uppercase tracking-widest">
                    <RefreshCcw className="h-3 w-3" />
                    Verify Status
                  </button>
                </motion.div>
              ) : (
                /* --- NORMAL LOGIN UI --- */
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="mb-8 text-center">
                    <h2 className="text-xl font-extrabold text-slate-800">Welcome Back</h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                      Please enter your authentication password.
                    </p>
                  </div>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="password"
                                  placeholder="Enter Password"
                                  className="login-pill-input"
                                  {...field}
                                />
                                <LockKeyhole className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300" />
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs font-bold text-rose-500 ml-4 mt-2" />
                          </FormItem>
                        )}
                      />

                      {error && (
                        <div className="bg-rose-50 border border-rose-100 rounded-xl py-3 px-6 flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-rose-500" />
                          <span className="text-sm font-bold text-rose-600">{error}</span>
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={loading}
                        className="login-pill-btn w-full shadow-lg shadow-blue-100">
                        {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Verify Access"}
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </>
  );
}
