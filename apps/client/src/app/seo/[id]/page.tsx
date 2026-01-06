"use client";

import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSEOAudit } from "@/hooks/useSEOAudit";
import PerformanceScore from "@/components/seo/PerformanceScore";
import CoreWebVitals from "@/components/seo/CoreWebVitals";
import AIInsightsSection from "@/components/seo/AIInsightsSection";
import MetadataChecks from "@/components/seo/MetadataChecks";

export default function SEOReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const url = searchParams.get("url");
  const domain = searchParams.get("domain_1");
  const date = searchParams.get("date_begin");
  const id = params.id;

  // Use Custom Hook for Fetching
  const { data, loading, aiLoading, error, isNetworkError } = useSEOAudit(url);

  if (!url) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-red-500">Invalid Request: No URL provided.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-50 dark:bg-black pt-24 pb-12 transition-colors duration-500">
      {/* Background Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10 space-y-8">
        {/* Navigation Back */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Button
            variant="ghost"
            className="pl-0 hover:bg-transparent hover:text-indigo-500"
            onClick={() => (window.location.href = "/")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end space-y-4 md:space-y-0 pb-6 border-b border-gray-200/50 dark:border-white/10"
        >
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Badge
                variant="outline"
                className="border-indigo-500 text-indigo-500 bg-indigo-500/10"
              >
                Report ID: {id}
              </Badge>
              <span className="text-xs text-muted-foreground">{date}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mt-2">
              SEO Audit{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
                Report
              </span>
            </h1>
            <p className="text-lg text-muted-foreground mt-2 flex items-center">
              for <span className="font-semibold text-foreground ml-2">{domain || url}</span>
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              className="border-gray-200 dark:border-white/10"
              onClick={() => window.print()}
            >
              Export PDF
            </Button>
            <Button
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20"
              onClick={() => (window.location.href = "/")}
            >
              New Audit
            </Button>
          </div>
        </motion.div>

        {/* Error State */}
        {error && !loading && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 backdrop-blur-sm">
            <CardContent className="pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-red-600 dark:text-red-400">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <div>
                  <h3 className="font-semibold">Analysis Failed</h3>
                  <p className="text-sm opacity-90">{error}</p>
                </div>
              </div>
              {isNetworkError && (
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white border-none shadow-md shadow-red-500/20"
                  onClick={() => (window.location.href = "/")}
                >
                  Go Back Home
                </Button>
              )}
            </CardContent>
          </Card>
        )}

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
              <CoreWebVitals data={data?.lighthouse_metrics} isLoading={loading} />
            </div>

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
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
