"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuth } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function handleAuthCallback() {
      try {
        const session = await supabaseAuth.getSession();
        if (session && session.access_token) {
          const onboardingDone =
            typeof window !== "undefined" &&
            localStorage.getItem("sutra_onboarding_completed") === "true";

          if (mounted) {
            if (onboardingDone) {
              router.replace("/dashboard");
            } else {
              router.replace("/onboarding");
            }
          }
        } else {
          if (mounted) {
            router.replace("/onboarding");
          }
        }
      } catch (err: any) {
        console.error("Auth callback exception:", err);
        if (mounted) {
          setErrorMsg(err.message || "Failed to complete authentication.");
          setTimeout(() => router.replace("/login"), 2500);
        }
      }
    }

    handleAuthCallback();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-lg border border-neutral-200">
        <div className="w-12 h-12 rounded-full border-3 border-neutral-900 border-t-transparent animate-spin mx-auto mb-4" />
        <h2 className="text-base font-bold text-neutral-900">
          {errorMsg ? "Authentication Error" : "Authenticating SUTRA..."}
        </h2>
        <p className="text-xs text-neutral-500 mt-2">
          {errorMsg || "Completing secure cryptographic handshake with identity provider."}
        </p>
      </div>
    </div>
  );
}
