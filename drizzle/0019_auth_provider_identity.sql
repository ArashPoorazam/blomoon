-- Better Auth 1.7.3+ no longer writes issuer. Keep historical values intact.
-- Lock out concurrent account writes while checking and changing identity keys.
LOCK TABLE "accounts" IN ACCESS EXCLUSIVE MODE;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "accounts"
    GROUP BY "provider_id", "account_id" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate account provider_id/account_id keys. Resolve identities before upgrading; accounts have not been merged or deleted.';
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_id_unique" ON "accounts" ("provider_id", "account_id");
--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "issuer" DROP NOT NULL;
--> statement-breakpoint
DROP INDEX "accounts_issuer_account_id_unique";
