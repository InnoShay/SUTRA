"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SkillHubLogo, SkillHubLogoIcon } from "@/components/SkillHubLogo";
import { AlertCircle, Loader2, ShieldCheck, Lock, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { supabaseAuth } from "@/lib/supabase";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLoggedOut = searchParams.get("logged_out") === "1";

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // If the user explicitly logged out, do not bounce to dashboard
    if (isLoggedOut) {
      setCheckingSession(false);
      return;
    }

    // Check if the user is already authenticated
    const checkExistingSession = async () => {
      try {
        const session = await supabaseAuth.getSession();
        if (session && session.access_token) {
          const onboardingDone =
            typeof window !== "undefined" &&
            localStorage.getItem("sutra_onboarding_completed") === "true";
          if (onboardingDone) {
            router.replace("/dashboard");
          } else {
            router.replace("/onboarding");
          }
          return;
        }
      } catch {
        // Continue to show login UI if session check fails
      } finally {
        setCheckingSession(false);
      }
    };

    checkExistingSession();
  }, [router, isLoggedOut]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/onboarding`
          : undefined;
      const { error } = await supabaseAuth.signInWithGoogle(redirectUrl);
      if (error) {
        setErrorMsg(error);
        setLoading(false);
      }
      // On success, Supabase will redirect to Google OAuth URL automatically
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to connect to Google authentication.");
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-5xl bg-white rounded-[32px] shadow-[0_20px_60px_rgba(15,23,42,0.06)] border border-neutral-200/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* LEFT COLUMN: Pure Clean Visual Image Showcase (No text overlays, no white overlay) */}
        <div className="lg:col-span-6 relative overflow-hidden hidden lg:block bg-neutral-100">
          <img
            src="/assets/login-students.jpg"
            alt="Students collaborating"
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* RIGHT COLUMN: Clean Google Auth Card */}
        <div className="lg:col-span-6 p-8 md:p-12 flex flex-col justify-between bg-white">
          <div className="max-w-sm w-full mx-auto my-auto py-8">
            {/* Center Asterisk Logo Icon */}
            <div className="flex justify-center mb-6 text-neutral-900">
              <SkillHubLogoIcon className="w-9 h-9" color="currentColor" />
            </div>

            {/* Header Titles */}
            <div className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
                Sign In to SUTRA
              </h1>
              <p className="text-xs text-neutral-400 mt-2 font-medium">
                Institutional Single Sign-On powered by Google Workspace &amp; Supabase
              </p>
            </div>

            {/* Logged Out Notice */}
            {isLoggedOut && (
              <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-xs text-emerald-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="leading-relaxed font-medium">
                  You have successfully signed out of SUTRA.
                </span>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-6 p-3.5 bg-red-50 border border-red-200/80 rounded-2xl text-xs text-red-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Google Sign-In Action */}
            <div className="space-y-3.5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || checkingSession}
                className="w-full py-3.5 px-4 bg-white hover:bg-neutral-50 active:scale-[0.99] border-2 border-neutral-200/90 hover:border-neutral-900 text-neutral-900 rounded-2xl text-sm font-semibold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {loading || checkingSession ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    {/* Google Colorful G SVG */}
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span className="font-semibold text-neutral-800 group-hover:text-neutral-900">
                      Continue with Google
                    </span>
                  </>
                )}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-neutral-200"></div>
                <span className="flex-shrink mx-3 text-[11px] font-medium text-neutral-400">or preview</span>
                <div className="flex-grow border-t border-neutral-200"></div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200/80 active:scale-[0.99] text-neutral-700 rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Offline Demo</span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/onboarding")}
                  className="py-2.5 px-3 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] text-white rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Start Onboarding</span>
                </button>
              </div>

              <div className="pt-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2 text-center">
                  Instant Role Workspaces
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard?role=faculty")}
                    className="p-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/70 rounded-xl text-[11px] font-medium text-neutral-800 text-center transition-all cursor-pointer"
                  >
                    Faculty
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard?role=counselor&walkthrough=counselor")}
                    className="p-2 bg-neutral-900 text-white hover:bg-neutral-800 border border-neutral-900 rounded-xl text-[11px] font-semibold text-center transition-all cursor-pointer shadow-2xs"
                  >
                    Counselor
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard?walkthrough=student")}
                    className="p-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/70 rounded-xl text-[11px] font-medium text-neutral-800 text-center transition-all cursor-pointer"
                  >
                    Student
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer security note */}
          <div className="text-center pt-4 border-t border-neutral-100">
            <p className="text-[10px] text-neutral-400 flex items-center justify-center gap-1.5 font-medium">
              <Lock className="w-3 h-3 text-neutral-400" />
              <span>Enterprise Grade • Supabase PostgreSQL • Zero Secrets in Client</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center text-xs text-neutral-400">
          Loading SUTRA Sign-In...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
