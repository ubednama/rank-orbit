"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useSEOAudit } from "@/hooks/useSEOAudit";
import PerformanceScore from "@/components/seo/PerformanceScore";
import CoreWebVitals from "@/components/seo/CoreWebVitals";
import AIInsightsSection from "@/components/seo/AIInsightsSection";
import MetadataChecks from "@/components/seo/MetadataChecks";
import { SocialPreview } from "@/components/seo/SocialPreview";
import { ReadabilityAnalysis } from "@/components/seo/ReadabilityAnalysis";
import { ReportHeader } from "@/components/seo/ReportHeader";
import { ErrorState } from "@/components/seo/ErrorState";

function SEOReportContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");

  const { data, loading, aiLoading, error, isNetworkError } = useSEOAudit(url);

  if (!url) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-red-500">Invalid Request: No URL provided.</p>
      </div>
    );
  }

  if (error && !loading) {
    return <ErrorState error={error} isNetworkError={isNetworkError} />;
  }

  return (
    <div className="min-h-screen relative bg-gray-50 dark:bg-black pt-24 pb-12 transition-colors duration-500">
      {/* Background Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10 space-y-8">
        <ReportHeader url={url} metadata={data?.metadata} loading={loading} />

        {/* Dashboard Content - Always render (show skeletons if loading) */}
        {(loading || data) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <PerformanceScore
                score={data?.lighthouse_metrics?.performance_score}
                loading={loading}
              />
              <CoreWebVitals analysis={data?.technical_analysis} isLoading={loading} />
            </div>

            {data?.metadata && (
              <SocialPreview
                title={data.metadata.og_title || data.metadata.title}
                description={data.metadata.og_description || data.metadata.description}
                image={data.metadata.og_image}
                url={url || ""}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* AI Insights - Main Column */}
              <div className="lg:col-span-2 space-y-6">
                <AIInsightsSection
                  data={data?.ai_analysis || null}
                  loading={loading || aiLoading}
                />
              </div>

              {/* Sidebar - Metadata & Checks */}
              <div className="space-y-6">
                <MetadataChecks data={data?.metadata} loading={loading} />
                {data?.readability_analysis && (
                  <ReadabilityAnalysis stats={data.readability_analysis} />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function SEOReportPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}
    >
      <SEOReportContent />
    </Suspense>
  );
}
