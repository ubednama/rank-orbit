"use client";

import { motion } from "framer-motion";
import { ArrowRight, Search, Zap, Shield, BarChart } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Hero() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    // The report page reads only `?url=...`. We used to also tack on a fake
    // `[id]` segment plus date_begin/date_end/domain_1 — none of which the
    // page ever read. Drop the noise; route is now `/seo?url=...`.
    router.push(`/seo?url=${encodeURIComponent(url)}`);
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden -mt-16 pt-16">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/30 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center justify-center gap-0"
        >
          {/* Live badge */}
          <div className="inline-flex items-center space-x-2 bg-white/60 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full px-5 py-2.5 mb-8 sm:mb-10 w-fit backdrop-blur-md shadow-sm">
            <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">
              Rank Orbit v2.0 Now Live
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-gray-900 dark:text-white mb-8 sm:mb-10 text-center leading-[1.1]">
            Master Your SEO
            <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
              With AI Precision
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12 sm:mb-14 text-center leading-relaxed">
            Instant, automated SEO audits powered by advanced AI. Uncover hidden opportunities,
            optimize performance, and rank higher — faster than ever.
          </p>

          {/* URL Input Form */}
          <form onSubmit={handleAnalyze} className="w-full max-w-2xl mx-auto relative group">
            <div className="absolute -inset-1 bg-linear-to-r from-indigo-500 to-purple-500 rounded-full opacity-30 dark:opacity-70 group-hover:opacity-60 dark:group-hover:opacity-100 blur-sm transition duration-200" />
            <div className="relative flex items-center bg-white dark:bg-black rounded-full p-1.5 md:p-2 border border-gray-200 dark:border-white/10 shadow-lg dark:shadow-none">
              <Search className="w-5 h-5 text-gray-400 ml-3 md:ml-4 shrink-0" />
              <input
                type="url"
                placeholder="https://yourwebsite.com"
                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3 md:px-4 py-2 text-sm md:text-base outline-hidden"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 dark:bg-white dark:text-black text-white rounded-full px-5 md:px-7 py-2.5 md:py-3 text-sm md:text-base font-semibold transition-colors flex items-center space-x-2 shrink-0"
              >
                <span>Analyze</span>
                <ArrowRight className="w-4 h-4 hidden sm:block" />
              </button>
            </div>
          </form>

          {/* Trust Badges */}
          <div className="mt-14 sm:mt-16 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-gray-500 dark:text-gray-500 text-sm">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span>Lightning Fast Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span>Enterprise-grade Security</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart className="w-4 h-4 text-blue-400" />
              <span>Actionable Insights</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
