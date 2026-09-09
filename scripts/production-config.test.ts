import { describe, expect, it } from "vitest";
// @ts-expect-error Deployment scripts run directly under Node, outside the app TS build.
import { productionConfig } from "./production-config.mjs";
const configuration = `BLOMOON_DOMAIN=blomoon.ir
TRAEFIK_ACME_EMAIL=admin@blomoon.ir
POSTGRES_DB=blomoon
POSTGRES_USER=blomoon
POSTGRES_PASSWORD='a@b:#$ c/=?'
BETTER_AUTH_URL=https://blomoon.ir
BETTER_AUTH_SECRET=abcdefghijklmnopqrstuvwxyz123456
RESEND_API_KEY=test
BLOMOON_AUTH_EMAIL_FROM="Blomoon <hello@blomoon.ir>"`;
const sha = "a".repeat(40);
describe("production configuration", () => {
  it("encodes literal password characters and pins both images to one release", () => {
    const env = productionConfig(configuration, "ghcr.io/example/blomoon", sha);
    expect(decodeURIComponent(new URL(env.DATABASE_URL).password)).toBe("a@b:#$ c/=?");
    expect(env.BLOMOON_IMAGE).toBe(`ghcr.io/example/blomoon:${sha}`);
    expect(env.BLOMOON_MIGRATE_IMAGE).toBe(`ghcr.io/example/blomoon-migrate:${sha}`);
  });
  it.each([
    [configuration.replace("BETTER_AUTH_URL=https://blomoon.ir", "BETTER_AUTH_URL=http://blomoon.ir"), sha],
    [configuration + "\nGOOGLE_CLIENT_ID=partial", sha],
    [configuration, "main"],
    [configuration.replace("POSTGRES_PASSWORD='a@b:#$ c/=?'", "POSTGRES_PASSWORD="), sha]
  ])("rejects invalid configuration before any commands execute", (contents, tag) => {
    expect(() => productionConfig(contents, "ghcr.io/example/blomoon", tag)).toThrow();
  });
});
