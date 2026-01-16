import { useState, useEffect, useRef } from "react";
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

/**
 * React hook for managing SEO audit lifecycle via Server-Sent Events
 *
 * Features:
 * - Real-time progress updates via SSE streaming
 * - Client-side caching with localStorage for instant repeat audits
 * - URL sanitization awareness and dual-cache strategy
 * - Graceful error handling with network failure detection
 *
 * @param url - Target URL to audit (null to idle)
 * @returns Audit state including data, loading flags, errors, and sanitized URL
 */
export function useSEOAudit(url: string | null) {
  const [reportData, setReportData] = useState<SEOReportData | null>(null);
  const [error, setError] = useState<string>("");
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [sanitizedUrl, setSanitizedUrl] = useState<string | null>(null);
  const sanitizedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    setSanitizedUrl(null);
    sanitizedUrlRef.current = null;

    if (url) {
      const cacheKey = `seo_audit_${url}`;
      /**
       * Attempt cache retrieval for original URL
       * Backend may sanitize the URL, in which case we cache under both keys
       * to handle both user-provided and sanitized URLs
       */
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
      setIsRateLimited(false);
      setLoading(true);
      setAiLoading(false);

      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3333";
      const streamUrl = `${gatewayUrl}/audit/stream?url=${encodeURIComponent(url)}`;

      // Initial check for Rate Limits (429) before opening SSE
      // EventSource doesn't expose status codes, so we peek with fetch first
      fetch(streamUrl, { method: "HEAD" })
        .then((res) => {
          if (res.status === 429) {
            toast.error("Monthly audit limit reached. Sign up or upgrade for more!", {
              action: {
                label: "Sign Up",
                onClick: () => (window.location.href = "/api/auth/login"),
              },
              duration: 8000,
            });
            setIsRateLimited(true);
            setLoading(false);
            return;
          }
          if (!res.ok && res.status !== 405) {
            // 405 might happen if HEAD not allowed, but we assume GET
            // Continue to try SSE anyway if unsure, or handle error
          }

          // Open SSE if check passes
          eventSource = new EventSource(streamUrl);

          eventSource.onmessage = (event) => {
            try {
              const parsed = JSON.parse(event.data);

              switch (parsed.type) {
                case "status":
                  // Special handling for Queue messages
                  if (parsed.message.toLowerCase().includes("queue")) {
                    toast.message("Queued", { description: parsed.message });
                  } else {
                    toast.info(parsed.message);
                  }
                  break;

                case "sanitized":
                  // URL was modified by backend to remove tracking parameters
                  setSanitizedUrl(parsed.data.sanitizedUrl);
                  sanitizedUrlRef.current = parsed.data.sanitizedUrl;
                  toast.success(`URL sanitized: ${parsed.data.sanitizedUrl}`);
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
                    return newData;
                  });
                  setLoading(false);
                  setAiLoading(true);
                  break;

                case "ai":
                  console.log("AI Response:", parsed.data);
                  setReportData((prev) => {
                    if (!prev) return null;
                    const finalData = {
                      ...prev,
                      ai_analysis: parsed.data.ai_analysis,
                    };
                    /**
                     * Dual-cache strategy: store under both original and sanitized URLs
                     * Ensures instant cache hits regardless of whether user includes tracking params
                     */
                    CacheService.set(cacheKey, finalData);
                    if (sanitizedUrlRef.current) {
                      const sanitizedCacheKey = `seo_audit_${sanitizedUrlRef.current}`;
                      CacheService.set(sanitizedCacheKey, finalData);
                    }
                    return finalData;
                  });
                  setAiLoading(false);
                  toast.success("AI Analysis Complete!");
                  break;

                case "error":
                  console.error("Audit Error:", parsed.message);
                  // Check if the error message is a 429 or limit related
                  if (
                    parsed.message?.includes("429") ||
                    parsed.message?.toLowerCase().includes("limit")
                  ) {
                    toast.error("Monthly audit limit reached. Sign up or upgrade for more!", {
                      action: {
                        label: "Sign Up",
                        onClick: () => (window.location.href = "/api/auth/login"),
                      },
                      duration: 8000,
                    });
                    setIsRateLimited(true);
                  } else {
                    setError(parsed.message);
                    toast.error(parsed.message);
                  }
                  eventSource?.close();
                  setLoading(false);
                  setAiLoading(false);
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
            if (eventSource?.readyState === EventSource.CLOSED) return;

            console.error("EventSource failed:", err);
            // Check if it's likely a server error (cannot easily distinguishing 500 vs network off from EventSource generic error)
            // But we can update the user message to be friendlier
            setError(
              "Connection interrupted. If this persists, our servers might be experiencing issues (500).",
            );
            setIsNetworkError(true);
            toast.error("Connection failed - Service might be down");
            eventSource?.close();
            setLoading(false);
            setAiLoading(false);
          };
        })
        .catch((e) => {
          console.error("Fetch/Setup error:", e);
          setError("Unable to reach the server. It's not you, it's us. Please try again later.");
          setLoading(false);
        });
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
    isRateLimited,
    sanitizedUrl,
  };
}
