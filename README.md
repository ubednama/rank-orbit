# Rank Orbit

Rank Orbit is an advanced SEO Audit and Analysis platform. It leverages a microservices architecture to crawl websites, analyze performance metrics (Lighthouse), and generate AI-powered SEO insights.

## 🏗️ Architecture

The system is built using a modern microservices approach:

```mermaid
graph TD
    Client[Next.js Client] -- SSE / HTTP --> Gateway[API Gateway (NestJS)]
    Gateway -- HTTP --> Crawler[Crawler Service (NestJS + Puppeteer)]
    Gateway -- HTTP --> AI[AI Service (Python FastAPI)]

    Crawler -- Returns --> Content[HTML & Lighthouse Metrics]
    Content -- Passed to --> AI
    AI -- Returns --> Insights[SEO Recommendations]
```

- **Client (Next.js)**: A responsive UI for initiating audits and viewing real-time results via Server-Sent Events (SSE).
- **API Gateway (NestJS)**: The central orchestrator. It handles client requests, delegates tasks to downstream services, and manages the SSE stream.
- **Crawler Service (NestJS)**: Using Puppeteer and Lighthouse, this worker service extracts page metadata, screenshots, and core web vitals.
- **AI Service (FastAPI)**: A Python-based service utilizing LangChain and Google Gemini to analyze content and provide actionable SEO strategies.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18+)
- **Python** (v3.9+)
- **pnpm** (recommended) or npm
- **Google Gemini API Key** (for AI features)

### One-Command Start

To launch all services (Client, Gateway, Crawler, AI) simultaneously:

```bash
./start-all.sh
```

**Access Points:**

- **Web App:** [http://localhost:4200](http://localhost:4200) (or 3000)
- **API Gateway:** [http://localhost:3333](http://localhost:3333)
- **Swagger Docs:** [http://localhost:3333/api/docs](http://localhost:3333/api/docs)

## 🔑 Environment Variables

Each service requires specific environment variables. Setup your `.env` or `.env.local` in the root (Monorepo approach) or per service.

| Service              | Variable                  | Description                                                                          |
| :------------------- | :------------------------ | :----------------------------------------------------------------------------------- |
| **Global / Gateway** | `NODE_ENV`                | `development` or `production`                                                        |
|                      | `PORT`                    | Gateway Port (Default: `3333`)                                                       |
|                      | `CRAWLER_SERVICE_URL`     | URL of the Crawler Service (e.g., `http://localhost:3001`)                           |
|                      | `AI_SERVICE_URL`          | URL of the AI Service info (e.g., `http://localhost:8000/api`)                       |
|                      | `CORS_ORIGINS`            | Comma-separated allowed origins (e.g. `http://localhost:4200,http://localhost:3000`) |
| **Crawler Service**  | `PORT`                    | Service Port (Default: `3001`)                                                       |
| **AI Service**       | `GOOGLE_API_KEY`          | **REQUIRED** for AI features.                                                        |
|                      | `MODEL_NAME`              | Model to use (Default: `gemini-pro`)                                                 |
| **Client**           | `NEXT_PUBLIC_GATEWAY_URL` | Public URL for the API Gateway (e.g., `http://localhost:3333/api`)                   |

## 🛠️ Developer Commands

### Running Tests

Run end-to-end tests to verify system stability:

```bash
npx nx e2e crawler-service-e2e
```

### API Documentation

The API Gateway provides a fully interactive Swagger UI.

- URL: [http://localhost:3333/api/docs](http://localhost:3333/api/docs)
- Use this to test endpoints like `POST /audit/analyze` manually.

### Code Formatting

Ensure consistent code style across TypeScript and Python:

```bash
# Format TypeScript/JS/JSON
npx prettier --write "apps/**/*.{ts,js,json}"

# Format Python (AI Service)
source apps/ai-service/venv/bin/activate
black apps/ai-service
```
