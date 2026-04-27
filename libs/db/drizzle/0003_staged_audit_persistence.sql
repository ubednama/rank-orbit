CREATE TYPE "public"."audit_status" AS ENUM('crawling', 'ai_running', 'complete', 'failed');--> statement-breakpoint
DROP INDEX "audits_url_created_idx";--> statement-breakpoint
ALTER TABLE "Audit" ALTER COLUMN "metadata" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Audit" ALTER COLUMN "lighthouse_metrics" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Audit" ALTER COLUMN "technical_analysis" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Audit" ALTER COLUMN "readability_analysis" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Audit" ALTER COLUMN "ai_analysis" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Audit" ADD COLUMN "userId" text;--> statement-breakpoint
ALTER TABLE "Audit" ADD COLUMN "status" "audit_status" DEFAULT 'crawling' NOT NULL;--> statement-breakpoint
ALTER TABLE "Audit" ADD COLUMN "aiScore" integer;--> statement-breakpoint
ALTER TABLE "Audit" ADD COLUMN "errorMessage" text;--> statement-breakpoint
ALTER TABLE "Audit" ADD COLUMN "errorStage" text;--> statement-breakpoint
ALTER TABLE "Audit" ADD COLUMN "crawlCompletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "Audit" ADD COLUMN "aiCompletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audits_url_status_updated_idx" ON "Audit" USING btree ("url","status","updatedAt");--> statement-breakpoint
CREATE INDEX "audits_user_created_idx" ON "Audit" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "audits_status_idx" ON "Audit" USING btree ("status");