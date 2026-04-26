"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { useUserContext } from "@/providers/UserContext";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, isLoading: userLoading } = useUserContext();

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
      await login(email, password);
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-24 max-w-md">
      <h1 className="text-3xl font-bold mb-2">Sign in</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
        Sign in to run more audits and access your history.
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-black/40 text-sm"
          />
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
          <LogIn className="w-4 h-4" />
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-sm text-gray-600 dark:text-gray-400 mt-6 text-center">
        New here?{" "}
        <Link href="/signup" className="text-indigo-600 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
