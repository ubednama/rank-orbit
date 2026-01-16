import logging
import json
import re
from typing import Dict, Any
from bs4 import BeautifulSoup
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

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
                model=settings.MODEL_NAME, 
                google_api_key=settings.GOOGLE_API_KEY, 
                temperature=1.0,
                max_retries=2
            )
            # Use StrOutputParser to get raw text for manual robust parsing
            self.parser = StrOutputParser()

            # Prepare the messages
            # System Prompt: Strict JSON output with specific schema
            self.prompt = ChatPromptTemplate.from_messages(
                [
                    (
                        "system",
                        "You are a Senior SEO Expert and Google Algorithm Specialist. "
                        "Analyze the provided website data and output your response in STRICT VALID JSON format only. "
                        "Follow this exact schema: \n"
                        "{{\"summary\": str, \"action_plan\": List[str], \"keyword_analysis\": str, \"detailed_report\": str, \"seo_score\": int, \"score_rationale\": str}} \n\n"
                        "INSTRUCTIONS: \n"
                        "1. 'summary': Write exactly 2 paragraphs summarizing the SEO status. Separate paragraphs with a double newline (\\n\\n). \n"
                        "2. 'action_plan': A list of highly specific, actionable steps. DO NOT repeat what is in the summary. Focus on technical fixes and content strategy. \n"
                        "3. 'detailed_report': A comprehensive report in MARKDOWN format. \n"
                        "   - Use '# Executive Summary' for the main title. \n"
                        "   - Use '## Content Deep Dive' for the analysis section. \n"
                        "   - Use '## Technical Technical' for technical insights if needed. \n"
                        "   - Ensure clear paragraph separation with double newlines. \n"
                        "   - DO NOT include 'SEO Identity' or meta tags in this text report. \n"
                        "   - DO NOT include a table of technical metrics (these are handled separately). \n"
                        "4. 'seo_score': An integer from 0-100 based on overall health. \n"
                        "5. 'technical_analysis': This field is NOT needed in your output (it is calculated programmatically). \n"
                    ),
                    (
                        "human",
                        """
                    - **CRITICAL**: Insert a double newline (\n\n) between every paragraph and list item to ensuring spacing.
                    - **CRITICAL**: Bold key terms using **term**.
                    - Structure:
                      
                      ## Executive Summary
                      (Paragraph 1)
                      
                      (Paragraph 2)

                      ## SEO Identity
                      - **Page Title**: ...
                      - **Description**: ...

                      ## Content Deep Dive
                      (Detailed analysis of content, keywords, and relevance)
                 """,
                    ),
                ]
            )

            self.chain = self.prompt | self.model | self.parser

        except Exception as e:
            logger.error(f"Failed to initialize AIInsightGenerator: {e}")
            self.chain = None

    def _clean_and_parse_json(self, raw_output: str) -> Dict[str, Any]:
        """
        Robustly clean and parse JSON from LLM output.
        Handles Markdown code blocks, invalid escapes, and newlines.
        """
        try:
            # 1. Strip Markdown code blocks
            text = raw_output.strip()
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            
            if text.endswith("```"):
                text = text[:-3]
            
            text = text.strip()

            # 2. Fix invalid escape sequences
            text = re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', text)

            # 3. Parse with strict=False
            return json.loads(text, strict=False)
        except json.JSONDecodeError as e:
            logger.error(f"JSON Parse Error: {e}")
            logger.error(f"Failed JSON Content: {text[:500]}...")
            raise e



    def generate(self, data: AnalyzeRequest) -> Dict:
        if not self.chain:
            return {
                "summary": "AI Insights are unavailable because the API Key is not configured. Please add your Gemini API Key to enable specific recommendations.",
                "action_plan": [
                    "**Configure API Key**: Add GOOGLE_API_KEY to your environment variables.",
                    "**Retry Audit**: Run the audit again to see AI-powered insights.",
                    "**Check Documentation**: Refer to the setup guide for API configuration."
                ],
                "technical_analysis": {},
                "keyword_analysis": "N/A - API Restricted",
                "detailed_report": "# Service Notice\n\nAI features are currently disabled due to missing configuration.\n\n## Next Steps\nPlease configure the backend services with a valid Gemini API key to unlock full reports.",
                "seo_score": 0,
                "score_rationale": "Score unavailable. API key missing.",
                "error": "not_configured"
            }

        # Double clean content to pure text for token efficiency
        soup = BeautifulSoup(data.page_content, "html.parser")
        text_content = soup.get_text(separator=" ", strip=True)[
            :10000
        ]  # Truncate to avoid token limits

        try:
            # Invoke chain to get raw string
            raw_result = self.chain.invoke(
                {
                    "title": data.metadata.get("title", "N/A"),
                    "description": data.metadata.get("description", "N/A"),
                    "lighthouse_metrics": json.dumps(data.lighthouse_metrics, indent=2),
                    "text_summary": text_content,
                }
            )

            # Parse the raw string
            parsed_result = self._clean_and_parse_json(raw_result)
            return parsed_result
            
        except Exception as e:
            error_msg = str(e).lower()
            error_code = "server_error"
            
            if "429" in error_msg or "quota" in error_msg or "resource exhausted" in error_msg:
                error_code = "quota_exceeded"
            
            logger.error(f"AI generation failed: {e}")
            return {
                "summary": "We encountered an issue generating AI insights for this page.",
                "action_plan": ["**Retry Later**: The AI service might be temporarily unavailable."],
                "technical_analysis": {},
                "keyword_analysis": "Error during generation",
                "detailed_report": f"# Error Report\n\nAn error occurred while processing the AI analysis.\n\nError details: {error_msg}",
                "seo_score": 0,
                "score_rationale": "Analysis failed due to a server error.",
                "error": error_code
            }


# Singleton instance
ai_generator = AIInsightGenerator()
