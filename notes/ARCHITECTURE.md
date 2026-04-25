# Rank Orbit Architecture

## Overview

Rank Orbit is a microservices-based SEO audit platform built with the **API Gateway pattern**. The architecture ensures clean separation of concerns with a central orchestrator handling all infrastructure while worker services focus solely on their specific tasks.

## Architecture Pattern

```
┌─────────────────────┐
│    Client (Next.js) │
│     Port: 5000      │
└──────────┬──────────┘
           │ HTTP
           ▼
┌─────────────────────────────────────────────────┐
│         API Gateway (NestJS)                    │
│              Port: 3333                         │
│                                                 │
│  ✓ Request Routing & Orchestration              │
│  ✓ Redis Caching (Bull Queues, Cache Manager)  │
│  ✓ Database Operations (Prisma)                │
│  ✓ Authentication & Authorization (DIY JWT)    │
│  ✓ Rate Limiting & Throttling                  │
│  ✓ Response Aggregation                        │
└────────────┬───────────────────┬────────────────┘
             │                   │
             │                   │
    ┌────────▼───────┐   ┌──────▼──────────┐
    │ Crawler Service│   │   AI Service    │
    │    (NestJS)    │   │   (FastAPI)     │
    │   Port: 3001   │   │   Port: 8000    │
    │                │   │                 │
    │ ✓ Puppeteer    │   │ ✓ LangChain     │
    │ ✓ Lighthouse   │   │ ✓ Google Gemini │
    │ ✓ Cheerio      │   │ ✓ SEO Analysis  │
    └────────────────┘   └─────────────────┘
```

## Service Responsibilities

### 🌐 API Gateway (Central Orchestrator)

**Purpose**: Single entry point for all client requests, handles all infrastructure concerns

**Key Dependencies**:

- `@nestjs/bull` - Job queue management
- `@nestjs/cache-manager` - Response caching
- `@prisma/client` - Database ORM
- `redis` / `ioredis` - Redis client
- `@keyv/redis` - Key-value storage
- `@nest-lab/throttler-storage-redis` - Rate limiting storage
- `@nestjs/passport` - Authentication
- `@nestjs/swagger` - API documentation

**Responsibilities**:

- ✅ Route incoming requests to appropriate services
- ✅ Manage Redis caching for audit results
- ✅ Handle database operations (CRUD for audits, users, projects)
- ✅ Implement authentication & authorization
- ✅ Apply rate limiting and throttling
- ✅ Aggregate responses from multiple services
- ✅ Manage background jobs via Bull queues

**Forbidden**:

- ❌ Direct web scraping or crawling
- ❌ Running Lighthouse audits
- ❌ AI/LLM processing

---

### 🕷️ Crawler Service (Task-Specific Worker)

**Purpose**: Execute web crawling and performance audits

**Key Dependencies**:

- `puppeteer` - Headless browser automation
- `lighthouse` - Performance auditing
- `cheerio` - HTML parsing
- `chrome-launcher` - Chrome process management
- `@nestjs/common`, `@nestjs/core` - Framework basics
- `nest-winston` - Logging

**Responsibilities**:

- ✅ Crawl websites using Puppeteer
- ✅ Run Lighthouse performance audits
- ✅ Parse HTML and extract metadata
- ✅ Return structured crawl results to API Gateway
- ✅ Handle crawl-specific errors and retries

**Forbidden**:

- ❌ Redis operations (no caching, no queues)
- ❌ Database operations (no Prisma)
- ❌ Authentication/authorization checks
- ❌ Direct client communication

---

### 🤖 AI Service (Task-Specific Worker)

**Purpose**: Provide AI-powered SEO analysis and recommendations

**Key Dependencies**:

- `fastapi` - Web framework
- `langchain` - LLM orchestration
- `langchain-google-genai` - Google Gemini integration
- `pydantic-settings` - Configuration management

**Responsibilities**:

- ✅ Analyze SEO data using LLMs
- ✅ Generate improvement recommendations
- ✅ Process natural language queries
- ✅ Return AI-generated insights to API Gateway

**Forbidden**:

- ❌ Redis operations
- ❌ Database operations
- ❌ Web crawling or scraping
- ❌ Direct client communication

---

## Key Principles

### 1. **Single Entry Point**

All client requests **MUST** go through the API Gateway. Microservices do not expose public endpoints to clients.

### 2. **Service Isolation**

Worker services (Crawler, AI) are stateless and focus solely on their task-specific logic. They do not manage infrastructure concerns.

### 3. **Gateway Orchestration**

The API Gateway is responsible for:

- Request routing
- Data persistence
- Caching strategies
- Authentication
- Response aggregation

### 4. **Independent Scaling**

Each service can be scaled independently based on load:

- **API Gateway**: Scale for high request volumes
- **Crawler Service**: Scale for concurrent crawls
- **AI Service**: Scale for AI processing workload

### 5. **Clear Dependency Boundaries**

| Dependency Category  | API Gateway | Crawler Service | AI Service |
| -------------------- | ----------- | --------------- | ---------- |
| Redis                | ✅          | ❌              | ❌         |
| Database (Prisma)    | ✅          | ❌              | ❌         |
| Authentication       | ✅          | ❌              | ❌         |
| Puppeteer/Lighthouse | ❌          | ✅              | ❌         |
| LLM/AI               | ❌          | ❌              | ✅         |

## Decision Matrix: "Where Should This Logic Go?"

Use this decision tree when adding new features:

```
Does it involve caching, database, or auth?
├─ YES → API Gateway
└─ NO
    │
    ├─ Does it involve web scraping or Lighthouse?
    │   └─ YES → Crawler Service
    │
    └─ Does it involve AI/LLM processing?
        └─ YES → AI Service
```

**Examples**:

| Feature                      | Service         | Reason                 |
| ---------------------------- | --------------- | ---------------------- |
| Store audit results          | API Gateway     | Database operation     |
| Check if audit in cache      | API Gateway     | Redis operation        |
| Run Lighthouse audit         | Crawler Service | Task-specific          |
| Generate SEO recommendations | AI Service      | AI processing          |
| Rate limit API requests      | API Gateway     | Infrastructure concern |
| Parse meta tags from HTML    | Crawler Service | Crawling task          |
| Validate JWT token           | API Gateway     | Authentication         |

## Communication Flow

### Example: Full SEO Audit Flow

1. **Client** sends POST request to `/api/audits`
2. **API Gateway**:
   - Validates authentication
   - Checks Redis cache for existing audit
   - If cache miss, forwards request to Crawler Service
3. **Crawler Service**:
   - Launches Puppeteer
   - Runs Lighthouse audit
   - Returns crawl results to API Gateway
4. **API Gateway**:
   - Stores results in database (Prisma)
   - Caches results in Redis
   - (Optionally) Forwards to AI Service for analysis
5. **AI Service**:
   - Generates SEO recommendations
   - Returns insights to API Gateway
6. **API Gateway**:
   - Aggregates crawler + AI data
   - Returns final response to Client

## Development Commands

### Nx Workspace Commands

```bash
# Start all services
npx nx serve api-gateway    # Port 3333
npx nx serve crawler-service # Port 3001
npx nx serve ai-service      # Port 8000 (uses venv)
PORT=5000 npx nx serve client # Port 5000

# Build services
npx nx build api-gateway
npx nx build crawler-service

# Run tests
npx nx test <service-name>
```

### AI Service (Python/FastAPI)

The AI service uses a Python virtual environment. The `project.json` configuration automatically activates it:

```bash
npx nx serve ai-service
# Internally runs: source venv/bin/activate && uvicorn app.main:app --reload
```

## Environment Variables

Each service has its own `.env` file:

- `apps/api-gateway/.env` - Gateway config (Redis URL, DB URL, JWT secret, etc.)
- `apps/crawler-service/.env` - Crawler config (Port, timeouts)
- `apps/ai-service/.env` - AI config (Gemini API key)

## Related Documentation

- [API Gateway KI](/Users/ubednama/.gemini/antigravity/knowledge/api_gateway_microservices_architecture/artifacts/overview.md) - Service communication patterns
- [Implementation Plan](file:///Users/ubednama/.gemini/antigravity/brain/0fcb6951-a0a6-42fb-bcd7-81be72416552/implementation_plan.md) - Recent architecture cleanup

## Troubleshooting

### Redis Source Map Warnings

If you see `Failed to parse source map` warnings for `@redis/bloom` in crawler-service:

**Root Cause**: Redis packages are workspace dependencies but not used by crawler-service. Webpack tries to bundle them.

**Solution**: Redis packages are marked as `externals` in `webpack.config.js`, preventing bundling.

### Service Cannot Connect

- **Check ports**: Ensure each service runs on its designated port
- **Check API Gateway routes**: Verify proxy configuration in `api-gateway/src/app`
- **Check CORS**: API Gateway should allow requests from client origin

### Authentication Failures

All auth logic belongs in API Gateway. Worker services should **never** perform auth checks.

---

**Last Updated**: 2026-02-04  
**Architecture Pattern**: API Gateway with Microservices  
**Nx Version**: 22.3.3
