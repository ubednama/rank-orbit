export interface ImageInfo {
  src: string;
  alt: string;
}

export interface SeoMetadata {
  title: string;
  description: string;
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
  recommendations: string[];
  detailed_report?: string;
  seo_score?: number;
  score_rationale?: string;
}

export interface CrawlResult {
  metadata: SeoMetadata;
  page_content: string;
  lighthouse_metrics?: LighthouseMetrics;
}

export interface AiAnalysisResponse {
  ai_analysis: AIAnalysis;
}
