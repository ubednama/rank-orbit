CREATE TABLE IF NOT EXISTS "Audit" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"lighthouse_metrics" jsonb NOT NULL,
	"technical_analysis" jsonb NOT NULL,
	"readability_analysis" jsonb NOT NULL,
	"ai_analysis" jsonb NOT NULL,
	"contentHash" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audits_url_created_idx" ON "Audit" USING btree ("url","createdAt");