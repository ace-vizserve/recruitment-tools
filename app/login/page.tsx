"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Link2, Loader2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  password: z.string().min(1, { message: "Password is required." }),
});

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
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
        setError(data.error || "Invalid credentials");
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
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap");

        .login-pill-root {
          font-family: "Inter", sans-serif;
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
          box-shadow:
            0 20px 25px -5px rgba(0, 0, 0, 0.05),
            0 10px 10px -5px rgba(0, 0, 0, 0.02);
          position: relative;
        }

        /* Larger, cleaner inputs */
        .login-pill-input {
          border-radius: 9999px !important;
          border: 1.5px solid #e2e8f0 !important;
          background: #fcfdfe !important;
          color: #1e293b !important;
          font-size: 1rem !important; /* Larger text */
          height: 3.5rem !important; /* Taller pill */
          padding-left: 3rem !important;
          transition: all 0.2s ease;
        }

        .login-pill-input:focus {
          border-color: #3b82f6 !important;
          background: white !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12) !important;
        }

        .login-pill-label {
          font-size: 0.85rem !important; /* Larger label */
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #64748b !important;
          margin-left: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .login-pill-btn {
          background: #3b82f6 !important;
          color: white !important;
          font-weight: 700 !important;
          font-size: 1rem !important; /* Larger text */
          height: 3.5rem !important;
          border: none !important;
          border-radius: 9999px !important;
          transition: all 0.2s ease !important;
        }

        .login-pill-btn:hover:not(:disabled) {
          background: #2563eb !important;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -5px rgba(59, 130, 246, 0.3) !important;
        }

        .login-pill-btn:active {
          transform: translateY(0);
        }

        .login-pill-error {
          background: #fff1f2;
          border: 1px solid #fee2e2;
          border-radius: 9999px; /* Pill-shaped error */
          padding: 0.75rem 1.25rem;
        }

        .login-pill-icon {
          position: absolute;
          left: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          transition: color 0.2s;
        }

        .login-field-wrap:focus-within .login-pill-icon {
          color: #3b82f6;
        }
      `}</style>

      <div className="login-pill-root flex min-h-screen items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-2xl">
          {/* Header Area */}
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-200 flex items-center justify-center mb-6">
              <Link2 className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">MRF Job Links Portal</h1>
            <p className="text-sm font-semibold text-blue-500 uppercase tracking-[0.2em]">Authorized Access Only</p>
          </div>

          {/* Login Panel */}
          <div className="login-pill-panel p-10">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-800">Welcome Back</h2>
              <p className="text-slate-500 mt-1">Please enter your credentials.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="login-pill-label">Password</FormLabel>
                      <FormControl>
                        <div className="relative login-field-wrap">
                          <Input type="password" placeholder="••••••••••••" className="login-pill-input" {...field} />
                          <span className="login-pill-icon">
                            <LockKeyhole className="h-5 w-5" />
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage className="text-sm text-rose-500 ml-4 mt-2" />
                    </FormItem>
                  )}
                />

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="login-pill-error flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
                      <span className="text-sm font-medium text-rose-600">{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button type="submit" disabled={loading} className="login-pill-btn w-full">
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Checking...
                    </span>
                  ) : (
                    "Continue to Generator"
                  )}
                </Button>
              </form>
            </Form>
          </div>

          <footer className="mt-8 text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              &copy; {new Date().getFullYear()} HFSE Global Education Group
            </p>
          </footer>
        </motion.div>
      </div>
    </>
  );
}
