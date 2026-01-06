from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class AnalyzeRequest(BaseModel):
    page_content: str
    metadata: Dict[str, Any]
    lighthouse_metrics: Dict[str, Any]

class AIResponse(BaseModel):
    summary: str = Field(description="A 2-3 paragraph executive summary of the SEO analysis.")
    recommendations: List[str] = Field(description="A list of 3 to 5 actionable recommendations to improve the SEO score.")
    keyword_analysis: Optional[str] = Field(description="Analysis of keyword usage in headers versus body.")
    detailed_report: str = Field(description="A comprehensive markdown-formatted report including tables, bullet points, and categorized insights.")
    seo_score: int = Field(description="An overall SEO score from 0 to 100 based on content and technical analysis.")
    score_rationale: str = Field(description="A single sentence explaining the main reason for the given seo_score.")
