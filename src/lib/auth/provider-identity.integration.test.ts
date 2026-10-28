import { readFileSync } from "node:fs";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

const enabled = process.env.AUTH_INTEGRATION === "1";
const client = enabled ? postgres(process.env.DATABASE_URL!, { max: 1, prepare: false }) : null;
const migration = readFileSync("drizzle/0019_auth_provider_identity.sql", "utf8")
  .replaceAll('"accounts"', '"auth_upgrade_accounts"')
  .replaceAll('"accounts_provider_account_id_unique"', '"auth_upgrade_provider_key"')
  .replaceAll('"accounts_issuer_account_id_unique"', '"auth_upgrade_issuer_key"')
  .split("--> statement-breakpoint");
afterAll(async () => { await client?.end(); });

async function prepare(tx: postgres.TransactionSql) {
  await tx`create temporary table auth_upgrade_accounts (
    user_id text not null, provider_id text not null, account_id text not null, issuer text not null
  ) on commit drop`;
  await tx`create unique index auth_upgrade_issuer_key on auth_upgrade_accounts (issuer, account_id)`;
}

async function migrate(tx: postgres.TransactionSql) {
  for (const statement of migration) await tx.unsafe(statement);
}

describe.skipIf(!enabled)("Better Auth provider-key migration (temporary tables)", () => {
  it("preserves historical identities and accepts new accounts without an issuer", async () => {
    await client!.begin(async (tx) => {
      await prepare(tx);
      await tx`insert into auth_upgrade_accounts values ('existing-user', 'credential', 'shared-id', 'local:credential')`;
      await migrate(tx);
      await tx`insert into auth_upgrade_accounts (user_id, provider_id, account_id) values ('other-user', 'google', 'shared-id')`;
      const rows = await tx`select * from auth_upgrade_accounts order by provider_id`;
      expect(rows).toMatchObject([
        { user_id: "existing-user", issuer: "local:credential" },
        { user_id: "other-user", issuer: null }
      ]);
      await expect(tx.savepoint(async (sp) => {
        await sp`insert into auth_upgrade_accounts (user_id, provider_id, account_id) values ('duplicate-user', 'google', 'shared-id')`;
      })).rejects.toMatchObject({ code: "23505" });
    });
  });

  it("stops on ambiguous provider identities without merging or removing accounts", async () => {
    await client!.begin(async (tx) => {
      await prepare(tx);
      await tx`insert into auth_upgrade_accounts values
        ('first-user', 'google', 'shared-id', 'issuer-one'),
        ('second-user', 'google', 'shared-id', 'issuer-two')`;
      await expect(tx.savepoint(migrate)).rejects.toThrow("Duplicate account provider_id/account_id keys");
      const rows = await tx`select user_id from auth_upgrade_accounts order by user_id`;
      expect(rows.map(({ user_id }) => user_id)).toEqual(["first-user", "second-user"]);
    });
  });
});
