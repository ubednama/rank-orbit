"use client";

import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export interface RateLimitStateProps {
  /**
   * If true: anon user hit their free quota — they need to sign in to keep going.
   * If false (default): signed-in user hit their monthly quota — show upgrade copy.
   */
  requiresSignIn?: boolean;
}

export function RateLimitState({ requiresSignIn = false }: RateLimitStateProps) {
  const router = useRouter();

  // Preserve the audit URL so the user lands back here after signing in.
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
  const redirectTo = encodeURIComponent(currentPath);

  if (requiresSignIn) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl pt-24 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6 max-w-lg">
          <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center mx-auto mb-6 ring-8 ring-indigo-50 dark:ring-indigo-900/10">
            <Lock className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Sign in to continue</h2>
            <p className="text-muted-foreground text-lg">
              You've used your one free audit. Sign in (or create an account) to keep going — free
              tier includes <strong>3 audits per month</strong> plus your audit history.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/login?redirect_to=${redirectTo}`)}
              className="w-full sm:w-auto"
            >
              Sign in
            </Button>
            <Button
              onClick={() => router.push(`/signup?redirect_to=${redirectTo}`)}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
            >
              Create account <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            We'll bring you right back to this audit after sign-in.
          </p>
        </div>
      </div>
    );
  }

  // Signed-in user hit their monthly limit
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pt-24 min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 max-w-lg">
        <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-6 ring-8 ring-orange-50 dark:ring-orange-900/10">
          <Lock className="w-10 h-10 text-orange-600 dark:text-orange-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Monthly limit reached</h2>
          <p className="text-muted-foreground text-lg">
            You've used all 3 free audits for this month. Resets on the 1st — or upgrade for
            unlimited access.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button variant="outline" onClick={() => router.push("/")} className="w-full sm:w-auto">
            Go Home
          </Button>
          <Button
            onClick={() => router.push("/pricing")}
            className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white border-0"
          >
            See plans <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
