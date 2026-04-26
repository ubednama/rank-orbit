import { LighthouseMetrics, SeoMetadata } from "@shared/types";

export interface AnalyzeRequestDto {
  page_content: string;
  metadata: SeoMetadata;
  lighthouse_metrics: LighthouseMetrics;
  contentHash?: string;
}
