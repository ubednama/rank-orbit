import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  LighthouseMetrics,
  SeoMetadata as Metadata,
  AIAnalysis,
  TechnicalAnalysis,
  ReadabilityStats,
} from "@shared/types";
import { CacheService } from "../services/cache.service";

export interface SEOReportData {
  lighthouse_metrics: LighthouseMetrics;
  metadata: Metadata;
  ai_analysis: AIAnalysis | null;
  technical_analysis?: TechnicalAnalysis;
  readability_analysis?: ReadabilityStats;
}

export function useSEOAudit(url: string | null) {
  const [reportData, setReportData] = useState<SEOReportData | null>(null);
  const [error, setError] = useState<string>("");
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    if (url) {
      const cacheKey = `seo_audit_${url}`;
      const cached = CacheService.get<SEOReportData>(cacheKey);

      if (cached) {
        setReportData(cached);
        setLoading(false);
        setAiLoading(false);
        return;
      }

      setReportData(null);
      setError("");
      setIsNetworkError(false);
      setLoading(true);
      setAiLoading(false);

      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3333";
      eventSource = new EventSource(`${gatewayUrl}/audit/stream?url=${encodeURIComponent(url)}`);

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);

          switch (parsed.type) {
            case "status":
              toast.info(parsed.message);
              break;

            case "crawler":
              console.log("Crawler Response:", parsed.data);
              setReportData((prev) => {
                const newData = {
                  ...(prev || {}),
                  lighthouse_metrics: parsed.data.lighthouse_metrics,
                  metadata: parsed.data.metadata,
                  technical_analysis: parsed.data.technical_analysis,
                  readability_analysis: parsed.data.readability_analysis,
                  ai_analysis: null,
                } as SEOReportData;
                // Update cache partially? No, wait for AI.
                return newData;
              });
              setLoading(false); // Crawler done, page is ready
              setAiLoading(true); // Now waiting for AI
              break;

            case "ai":
              console.log("AI Response:", parsed.data);
              setReportData((prev) => {
                if (!prev) return null;
                const finalData = {
                  ...prev,
                  ai_analysis: parsed.data.ai_analysis,
                };
                // Cache the final result
                CacheService.set(cacheKey, finalData);
                return finalData;
              });
              setAiLoading(false);
              toast.success("AI Analysis Complete!");
              break;

            case "complete":
              eventSource?.close();
              setLoading(false);
              setAiLoading(false);
              break;
          }
        } catch (e) {
          console.error("Error parsing SSE event:", e);
        }
      };

      eventSource.onerror = (err) => {
        console.error("EventSource failed:", err);
        setError("Connection lost. Please try again.");
        setIsNetworkError(true); // Assuming connection issue
        toast.error("Connection failed.");
        eventSource?.close();
        setLoading(false);
        setAiLoading(false);
      };
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [url]);

  return {
    data: reportData,
    loading,
    aiLoading,
    error,
    isNetworkError,
  };
}
