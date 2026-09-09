import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function workspace() {
  const directory = mkdtempSync(join(tmpdir(), "blomoon-deploy-test-"));
  const executable = (name: string, script: string) => writeFileSync(join(directory, name), `#!/bin/sh\nset -eu\n${script}\n`, { mode: 0o700 });
  return { directory, executable, cleanup: () => rmSync(directory, { recursive: true, force: true }) };
}

describe("deployment failure boundaries", () => {
  it("stops before starting the app when migrations fail", () => {
    const work = workspace();
    try {
      const config = readFileSync(".env.production.example", "utf8")
        .replace("POSTGRES_PASSWORD=", "POSTGRES_PASSWORD=test-password")
        .replace("BETTER_AUTH_SECRET=", `BETTER_AUTH_SECRET=${"a".repeat(32)}`)
        .replace("RESEND_API_KEY=", "RESEND_API_KEY=test");
      writeFileSync(join(work.directory, ".env.production"), config);
      work.executable("docker", 'printf "%s\\n" "$*" >> "$BLOMOON_DEPLOY_DIR/commands"\ncase "$*" in *"run --rm migrate") exit 42;; esac');
      const result = spawnSync(process.execPath, ["scripts/deploy.mjs", "a".repeat(40)], {
        encoding: "utf8", env: { ...process.env, PATH: `${work.directory}:${process.env.PATH}`, BLOMOON_DEPLOY_DIR: work.directory, BLOMOON_REGISTRY_IMAGE: "ghcr.io/example/blomoon" }
      });
      expect(result.status).toBe(1);
      const commands = readFileSync(join(work.directory, "commands"), "utf8");
      expect(commands).toContain("run --rm backup");
      expect(commands).toContain("run --rm migrate");
      expect(commands).not.toContain("120 app catalog");
      expect(readdirSync(work.directory)).not.toContain("current-release.json");
    } finally { work.cleanup(); }
  });
  it.each([true, false])("publishes a backup only when pg_dump succeeds (failure=%s)", (fail) => {
    const work = workspace();
    try {
      work.executable("pg_dump", fail ? 'exit 42' : 'for arg in "$@"; do case "$arg" in --file=*) printf archive > "${arg#--file=}";; esac; done');
      work.executable("pg_restore", 'exit 0');
      const directory = join(work.directory, "backups");
      const result = spawnSync("sh", [resolve("scripts/backup.sh")], {
        encoding: "utf8", env: { ...process.env, PATH: `${work.directory}:${process.env.PATH}`, BLOMOON_BACKUP_DIR: directory }
      });
      expect(result.status === 0).toBe(!fail);
      const files = readdirSync(directory);
      expect(files.filter((name) => name.endsWith(".dump"))).toHaveLength(fail ? 0 : 1);
      expect(files.some((name) => name.endsWith(".tmp"))).toBe(false);
    } finally { work.cleanup(); }
  });
});
