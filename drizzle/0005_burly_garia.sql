ALTER TABLE "users" ADD COLUMN "first_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "login_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tips_dismissed_at" timestamp with time zone;--> statement-breakpoint
WITH "session_rollups" AS (
	SELECT
		"user_id",
		count("id")::integer AS "login_count",
		max("created_at") AS "last_login_at"
	FROM "sessions"
	GROUP BY "user_id"
)
UPDATE "users"
SET
	"first_login_at" = "users"."created_at",
	"last_login_at" = "session_rollups"."last_login_at",
	"login_count" = "session_rollups"."login_count",
	"tips_dismissed_at" = NULL
FROM "session_rollups"
WHERE "users"."id" = "session_rollups"."user_id";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_login_count_nonnegative" CHECK ("users"."login_count" >= 0);
