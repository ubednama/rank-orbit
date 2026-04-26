"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Search, BarChart, Server } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const loadingMessages = [
  "Initializing...",
  "Crawling website structure...",
  "Analyzing technical performance...",
  "Generating AI Insights...",
];

const seoBenefits = [
  "Did you know? The first 5 organic results account for 67.6% of all clicks.",
  "Fast loading pages rank higher and convert better.",
  "Mobile-friendliness is a significant ranking factor for Google.",
  "Optimizing meta tags can increase click-through rates by up to 30%.",
  "High-quality backlinks are one of the top 3 ranking signals.",
  "Voice search queries are longer: optimize for conversational keywords.",
  "Video content is 50x more likely to drive organic search results than plain text.",
  "Updating old content can increase organic traffic by as much as 106%.",
];

export default function AIInsightsLoading() {
  const [step, setStep] = useState(0);
  const [benefitIndex, setBenefitIndex] = useState(0);

  useEffect(() => {
    // Cycle through main loading messages
    if (step < loadingMessages.length - 1) {
      const timer = setTimeout(() => {
        setStep((prev) => prev + 1);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      // Once main messages are done, cycle through benefits indefinitely
      const benefitTimer = setInterval(() => {
        setBenefitIndex((prev) => (prev + 1) % seoBenefits.length);
      }, 4000);
      return () => clearInterval(benefitTimer);
    }
  }, [step]);

  return (
    <Card className="h-full bg-white/40 dark:bg-white/5 backdrop-blur-md border border-indigo-500/20 shadow-xl shadow-indigo-500/5 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-2xl -ml-8 -mb-8 pointer-events-none" />

      <CardHeader className="relative z-10">
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              {step === 0 && (
                <Search className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              )}
              {step === 1 && (
                <Server className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              )}
              {step === 2 && (
                <BarChart className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              )}
              {step >= 3 && (
                <Zap className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              )}
            </div>
            <div className="absolute -inset-2 bg-indigo-500/20 rounded-xl blur-lg animate-pulse" />
          </div>

          <div className="flex-1">
            <div className="h-6 w-48 bg-indigo-100/50 dark:bg-white/10 rounded-md overflow-hidden relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="absolute inset-0 flex items-center px-1"
                >
                  <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                    {loadingMessages[step]}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 relative z-10">
        {/* Score Skeleton */}
        <div className="border-t border-indigo-100/30 dark:border-white/5">
          <p className="text-xs font-semibold text-indigo-400 dark:text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <SparklesIcon className="w-3 h-3" />
            While you wait
          </p>
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl relative overflow-hidden min-h-[80px] flex items-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={benefitIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
                className="text-sm text-indigo-800 dark:text-indigo-200 font-medium italic leading-relaxed"
              >
                "{seoBenefits[benefitIndex]}"
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        <Skeleton className="h-28 w-full rounded-2xl bg-indigo-50/50 dark:bg-white/5" />

        {/* Summary Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4 bg-indigo-50/50 dark:bg-white/5" />
          <Skeleton className="h-4 w-full bg-indigo-50/50 dark:bg-white/5" />
          <Skeleton className="h-4 w-5/6 bg-indigo-50/50 dark:bg-white/5" />
        </div>

        {/* Recommendations Skeleton */}
        <div className="grid gap-3">
          <Skeleton className="h-20 w-full rounded-xl bg-indigo-50/50 dark:bg-white/5" />
          <Skeleton className="h-20 w-full rounded-xl bg-indigo-50/50 dark:bg-white/5" />
        </div>

        {/* SEO Tips Carousel */}
      </CardContent>
    </Card>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M9 3v4" />
      <path d="M3 5h4" />
      <path d="M3 9h4" />
    </svg>
  );
}
