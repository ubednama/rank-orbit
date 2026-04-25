# 01 — Product

## What

**Rank Orbit** is a SaaS SEO analyzer. Paste a URL, get back:

- Lighthouse performance metrics (Performance, Accessibility, LCP, CLS, TBT, FCP, Speed Index)
- Page metadata (title, description, OG tags, headings, image alt audit)
- Readability stats (grade, word count, sentence length, keyword density)
- AI-generated SEO insights (executive summary, prioritized action plan, score + rationale, detailed report)

Results stream live via Server-Sent Events — the user sees Lighthouse metrics as soon as the crawler finishes (~10–30s), then AI insights when Gemini returns (~5–15s after that).

## Who

- **Developers** auditing their own sites pre-launch
- **Content marketers** validating page SEO before publishing
- **Agencies** doing quick audits for client pitches
- **Curious users** running one-off audits on competitors / inspiration

## Tiers

| Tier             | Phase | Audits            | Auth required |
| ---------------- | ----- | ----------------- | ------------- |
| Anonymous        | v1    | 1 lifetime per IP | No            |
| Free (signed-in) | v2    | 3 / month         | Yes (DIY JWT) |
| Paid             | v4+   | TBD               | Stripe        |

## Core flows

| Flow                             | Phase |
| -------------------------------- | ----- |
| Anonymous audit (1 free)         | v1    |
| Sign up + log in                 | v2    |
| Audit history dashboard          | v2    |
| Re-run audit                     | v2    |
| Export report (PDF / JSON)       | v3    |
| Multi-page audit (sitemap crawl) | v4    |
| Scheduled re-audits with diffs   | v4    |

## Differentiators

- **Live streaming** — SSE means no "audit in progress…" spinner; users see partial results immediately
- **Free anonymous tier** — lower friction than competitors that gate behind signup
- **Open source** — portfolio-quality codebase; transparent architecture

## Non-goals (explicitly out of scope)

- Backlink analysis (different data source, expensive)
- Keyword research (Ahrefs / SEMrush territory)
- Site-wide crawl (multi-page is v4 max; full-site crawl is too expensive on free tier)
- White-label / agency dashboards
