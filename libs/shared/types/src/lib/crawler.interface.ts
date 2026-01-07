export interface ImageInfo {
  src: string;
  alt: string;
}

export interface SeoMetadata {
  title: string;
  description: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  h1: string[];
  h2: string[];
  h3: string[];
  images: ImageInfo[];
  missing_alt_count: number;
}

export interface LighthouseMetrics {
  performance_score: number;
  accessibility_score: number;
  lcp: string;
  cls: string;
  tbt: string;
  fcp: string;
  speed_index: string;
  error?: string;
}

export interface AIAnalysis {
  summary: string;
  action_plan: string[];
  technical_analysis: Record<string, { value: string | number; status: string }>;
  keyword_analysis?: string;
  detailed_report?: string;
  seo_score?: number;
  score_rationale?: string;
  error?: string;
}

export interface TechnicalMetric {
  value: string | number;
  status: "Excellent" | "Good" | "Needs Work" | "Poor" | "Critical" | "Moderate";
}

export interface TechnicalAnalysis {
  Performance: TechnicalMetric;
  Accessibility: TechnicalMetric;
  LCP: TechnicalMetric;
  CLS: TechnicalMetric;
  TBT: TechnicalMetric;
  FCP: TechnicalMetric;
  "Speed Index": TechnicalMetric;
}

export interface ReadabilityStats {
  grade: number;
  wordCount: number;
  avgSentenceLength: number;
  density: { word: string; count: number; percent: number }[];
}

export interface CrawlResponse {
  metadata: SeoMetadata;
  lighthouse_metrics?: LighthouseMetrics;
  technical_analysis?: TechnicalAnalysis;
  readability_analysis?: ReadabilityStats;
}

// DTOs for Service Communication
export interface AiCrawlResponse extends CrawlResponse {
  page_content: string; // Required for AI and Crawler Service output
}

export interface AiAnalysisResponse {
  ai_analysis: AIAnalysis;
}
