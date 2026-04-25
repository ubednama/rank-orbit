CREATE TABLE IF NOT EXISTS "AuditUsage" (
	"identifier" text NOT NULL,
	"period" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "AuditUsage_identifier_period_pk" PRIMARY KEY("identifier","period")
);
