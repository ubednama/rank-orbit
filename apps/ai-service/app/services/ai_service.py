import logging
import json
from typing import Dict
from bs4 import BeautifulSoup
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from app.core.config import get_settings
from app.models.schemas import AnalyzeRequest, AIResponse

logger = logging.getLogger(__name__)
settings = get_settings()


class AIInsightGenerator:
    def __init__(self):
        try:
            if not settings.GOOGLE_API_KEY:
                logger.warning("API Key is missing. AI features will fail.")
                self.chain = None
                return

            self.model = ChatGoogleGenerativeAI(
                model=settings.MODEL_NAME, google_api_key=settings.GOOGLE_API_KEY, temperature=0.7
            )
            self.parser = JsonOutputParser(pydantic_object=AIResponse)

            self.prompt = ChatPromptTemplate.from_messages(
                [
                    (
                        "system",
                        "You are an expert Technical SEO Auditor. Your task is to analyze a page's content and technical stats."
                        "Your response must be in valid JSON format only, following the instructions: {format_instructions}",
                    ),
                    (
                        "human",
                        """
                 Analyze this website data:
                 
                 INFO:
                 - Page Title: {title}
                 - Description: {description}
                 
                 TECHNICAL METRICS (Lighthouse):
                 {lighthouse_metrics}
                 
                 CONTENT SUMMARY (Cleaned Text):
                 {text_summary}
                 
                 TASKS:
                 1. If 'performance_score' < 50, strictly warn about speed.
                 2. Analyze keyword usage across H1, H2, H3, and Body text.
                 3. Provide 5 actionable recommendations in the format: "**Heading**\\nDescription text...".
                 4. Calculate an 'seo_score' (0-100) based on content quality and technical health.
                 5. Provide a 'score_rationale': A concise sentence explaining why this score was given.
                 6. Generate a 'detailed_report' in Markdown format following these STRICT rules:
                    - **CRITICAL**: Do NOT use top-level headers like # Executive Summary or # Detailed Report. Start directly with the content.
                    - **CRITICAL**: Insert a double newline (\n\n) between every paragraph and list item to ensuring spacing.
                    - **CRITICAL**: Bold key terms using **term**.
                    - Structure the report as:
                      
                      ## Executive Summary
                      (Paragraph 1)
                      
                      (Paragraph 2)

                      ## SEO Identity
                      - **Page Title**: ...
                      - **Description**: ...

                      ## Content Deep Dive
                      ...

                      ## Technical Snapshot
                      (Markdown Table)

                      ## Action Plan
                      ...
                 """,
                    ),
                ]
            )

            self.chain = self.prompt | self.model | self.parser

        except Exception as e:
            logger.error(f"Failed to initialize AIInsightGenerator: {e}")
            self.chain = None

    def generate(self, data: AnalyzeRequest) -> Dict:
        if not self.chain:
            return {
                "summary": "AI Service not configured.",
                "recommendations": [],
                "keyword_analysis": "N/A",
            }

        # Double clean content to pure text for token efficiency
        soup = BeautifulSoup(data.page_content, "html.parser")
        text_content = soup.get_text(separator=" ", strip=True)[
            :10000
        ]  # Truncate to avoid token limits

        try:
            result = self.chain.invoke(
                {
                    "title": data.metadata.get("title", "N/A"),
                    "description": data.metadata.get("description", "N/A"),
                    "lighthouse_metrics": json.dumps(data.lighthouse_metrics, indent=2),
                    "text_summary": text_content,
                    "format_instructions": self.parser.get_format_instructions(),
                }
            )
            return result
        except Exception as e:
            logger.error(f"AI generation failed: {e}")
            return {
                "summary": "Error generating insights.",
                "recommendations": ["Check server logs."],
                "keyword_analysis": "Error",
            }


# Singleton instance
ai_generator = AIInsightGenerator()
