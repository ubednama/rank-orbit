CREATE TABLE "RefreshToken" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"tokenHash" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"revokedAt" timestamp,
	"replacedBy" text,
	"userAgent" text,
	"ip" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_hash_unique" ON "RefreshToken" USING btree ("tokenHash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_idx" ON "RefreshToken" USING btree ("userId","expiresAt");