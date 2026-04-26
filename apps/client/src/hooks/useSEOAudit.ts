import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LighthouseMetrics,
  SeoMetadata as Metadata,
  AIAnalysis,
  TechnicalAnalysis,
  ReadabilityStats,
} from "@shared/types";
import { CacheService } from "../services/cache.service";
import { useUserContext } from "@/providers/UserContext";

export interface SEOReportData {
  lighthouse_metrics: LighthouseMetrics;
  metadata: Metadata;
  ai_analysis: AIAnalysis | null;
  technical_analysis?: TechnicalAnalysis;
  readability_analysis?: ReadabilityStats;
}

/**
 * React hook for managing SEO audit lifecycle via Server-Sent Events.
 *
 * Auth flow (handbook/03-system-design.md "sse_token pattern"):
 *   1. POST /audit/start with optional Bearer → server validates + checks quota → returns sse_token
 *   2. EventSource at GET /audit/stream?sse_token=<token> (single-use, 60s TTL)
 *
 * On 429 from anon users: redirects to /login?redirect_to=<current> so the user
 * can sign in and continue with their tier (3/month).
 *
 * @param url - Target URL to audit (null to idle)
 */
export function useSEOAudit(url: string | null) {
  const router = useRouter();
  const { getAccessToken } = useUserContext();
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
    let isActive = true;

    setSanitizedUrl(null);
    sanitizedUrlRef.current = null;

    if (!url) return;

    const startAudit = async () => {
      const cacheKey = `seo_audit_${url}`;
      const cached = CacheService.get<SEOReportData>(cacheKey);

      if (cached) {
        if (isActive) {
          setReportData(cached);
          setLoading(false);
          setAiLoading(false);
        }
        return;
      }

      setReportData(null);
      setError("");
      setIsNetworkError(false);
      setIsRateLimited(false);
      setLoading(true);
      setAiLoading(false);

      try {
        const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3333";
        const accessToken = getAccessToken();

        // POST /audit/start authenticates (optional), pre-checks quota, and issues a single-use
        // sse_token (60s TTL). EventSource opens with that token in the query string.
        const startRes = await fetch(`${gatewayUrl}/api/audit/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ url }),
        });

        if (startRes.status === 429) {
          const body = await startRes.json().catch(() => ({}));
          if (body.requiresSignIn) {
            toast.info("Sign in to continue — you've used your free audit.", { duration: 5000 });
            const redirectTo = encodeURIComponent(
              window.location.pathname + window.location.search,
            );
            router.push(`/login?redirect_to=${redirectTo}`);
          } else {
            toast.error(body.message || "Monthly audit limit reached.", { duration: 6000 });
          }
          if (isActive) {
            setIsRateLimited(true);
            setLoading(false);
          }
          return;
        }

        if (!startRes.ok) {
          const body = await startRes.json().catch(() => ({}));
          throw new Error(body.message || `Audit start failed (${startRes.status})`);
        }

        const { sse_token } = (await startRes.json()) as { sse_token: string };
        const streamUrl = `${gatewayUrl}/api/audit/stream?sse_token=${encodeURIComponent(sse_token)}`;
        eventSource = new EventSource(streamUrl);

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);

            switch (parsed.type) {
              case "status":
                if (parsed.message?.toLowerCase().includes("queue")) {
                  toast.message("Queued", { description: parsed.message });
                } else {
                  toast.info(parsed.message);
                }
                break;

              case "sanitized":
                setSanitizedUrl(parsed.data.sanitizedUrl);
                sanitizedUrlRef.current = parsed.data.sanitizedUrl;
                toast.success(`URL sanitized: ${parsed.data.sanitizedUrl}`);
                break;

              case "crawler":
                setReportData(
                  (prev) =>
                    ({
                      ...(prev || {}),
                      lighthouse_metrics: parsed.data.lighthouse_metrics,
                      metadata: parsed.data.metadata,
                      technical_analysis: parsed.data.technical_analysis,
                      readability_analysis: parsed.data.readability_analysis,
                      ai_analysis: null,
                    }) as SEOReportData,
                );
                if (isActive) {
                  setLoading(false);
                  setAiLoading(true);
                }
                break;

              case "ai":
                setReportData((prev) => {
                  if (!prev) return null;
                  const finalData = {
                    ...prev,
                    ai_analysis: parsed.data.ai_analysis,
                  } as SEOReportData;
                  // Dual-cache: original URL + sanitized URL
                  CacheService.set(cacheKey, finalData);
                  if (sanitizedUrlRef.current) {
                    CacheService.set(`seo_audit_${sanitizedUrlRef.current}`, finalData);
                  }
                  return finalData;
                });
                if (isActive) {
                  setAiLoading(false);
                  toast.success("AI Analysis Complete!");
                }
                break;

              case "error":
                if (
                  parsed.message?.includes("429") ||
                  parsed.message?.toLowerCase().includes("limit")
                ) {
                  toast.error("You've reached your free limit. Accounts are coming soon.", {
                    duration: 6000,
                  });
                  if (isActive) setIsRateLimited(true);
                } else {
                  if (isActive) setError(parsed.message);
                  toast.error(parsed.message || "An error occurred during the audit");
                }
                eventSource?.close();
                if (isActive) {
                  setLoading(false);
                  setAiLoading(false);
                }
                break;

              case "complete":
                eventSource?.close();
                if (isActive) {
                  setLoading(false);
                  setAiLoading(false);
                }
                break;
            }
          } catch (e) {
            console.error("Error parsing SSE event:", e);
          }
        };

        eventSource.onerror = () => {
          if (eventSource?.readyState === EventSource.CLOSED) return;
          if (isActive) {
            setError(
              "Connection interrupted. If this persists, our servers might be experiencing issues.",
            );
            setIsNetworkError(true);
            setLoading(false);
            setAiLoading(false);
          }
          toast.error("Connection failed — service might be down");
          eventSource?.close();
        };
      } catch (e) {
        console.error("Audit setup failed:", e);
        if (isActive) setLoading(false);
      }
    };

    startAudit();

    return () => {
      isActive = false;
      if (eventSource) eventSource.close();
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
