# RankOrbit

> **Instant, AI-Powered SEO Analysis.**

RankOrbit is a high-performance SEO scanner designed to provide actionable insights in seconds. Unlike traditional tools that gate essential data behind paywalls or complex sign-up flows, RankOrbit offers an instant, anonymous "Time to Insight" for any URL.

## 🚀 Features

- **Instant Audit**: Get a comprehensive report in 10-15 seconds.
- **Technical Analysis**: Powered by Google Lighthouse to evaluate Performance, Accessibility, and SEO best practices.
- **Content Breakdown**: Detailed extraction of Heading tags (H1-H6), Meta descriptions, and Title tags.
- **AI-Driven Recommendations**: Smart, context-aware suggestions to improve your content and meta tags.
- **Keyword Intelligence**: Analyze keyword density and usage patterns to optimize for search engines.

## 🛠️ Tech Stack

Built with a modern, scalable architecture:

- **Frontend**: Next.js (React)
- **Backend API**: NestJS
- **Analysis Engine**: Puppeteer & Google Lighthouse
- **AI Service**: Python (FastAPI)
- **Database**: PostgreSQL with Prisma ORM
- **Infrastructure**: Nx Monorepo, RabbitMQ, Redis

## 💻 Getting Started

This project is generated using [Nx](https://nx.dev).

### Run the Development Server

To start the development server for the full stack:

```sh
# Start the client
npx nx serve client

# Start the API Gateway
npx nx serve api-gateway
```

### Build

To build the project for production:

```sh
npx nx build client
```
