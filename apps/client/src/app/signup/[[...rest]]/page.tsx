"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { useUserContext } from "@/providers/UserContext";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signup, isLoading: userLoading } = useUserContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = searchParams.get("redirect_to") || "/";

  useEffect(() => {
    if (!userLoading && user) router.replace(redirectTo);
  }, [user, userLoading, redirectTo, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup(email, password);
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-24 max-w-md">
      <h1 className="text-3xl font-bold mb-2">Create account</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
        Free tier: 3 audits per month and access to your audit history.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-black/40 text-sm"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-black/40 text-sm"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">At least 12 characters.</p>
        </div>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-md text-sm font-semibold flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="text-sm text-gray-600 dark:text-gray-400 mt-6 text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-indigo-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
