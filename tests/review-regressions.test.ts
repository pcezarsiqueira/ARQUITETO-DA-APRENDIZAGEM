import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  statSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildDiagnosis,
  approveDiagnosis,
  diagnosisLines,
  diagnosisOutputSchema,
} from "../src/domain/diagnosis";
import { updateProjectDiscovery } from "../src/domain/projects";
import { exampleProject } from "../src/domain/example";
import {
  loadProjectSnapshot,
  saveProjects,
  StorageConflictError,
} from "../src/persistence/projects";
import { GET } from "../src/app/api/diagnosis/status/route";
const analysis = {
  priorKnowledge: [],
  assumptions: [],
  gaps: [],
  barriers: [],
  competencies: [],
  needsValidation: ["O que o aprendiz precisa conseguir fazer?"],
  rationale:
    "Não há dados suficientes para propor competências sem inventar informações.",
};
test("empty categories do not force invented hypotheses; editing blank lines is safe", () => {
  assert.deepEqual(diagnosisOutputSchema.parse(analysis), analysis);
  assert.deepEqual(diagnosisLines("  Uma hipótese. \n\n Outra hipótese.\n"), [
    "Uma hipótese.",
    "Outra hipótese.",
  ]);
});
test("discovery edits withdraw stored approval and preserve prior approval and all materials", () => {
  const original = structuredClone(exampleProject);
  original.diagnosis = approveDiagnosis(
    buildDiagnosis(
      analysis,
      original.discovery,
      "test",
      "2026-10-23T10:00:00.000Z",
    ),
    original.discovery,
    "2026-10-23T10:01:00.000Z",
  );
  const same = updateProjectDiscovery(
    original,
    original.discovery,
    "2026-10-23T11:00:00.000Z",
  );
  assert.equal(same.diagnosis?.review?.status, "approved");
  assert.equal(same.diagnosisHistory, undefined);
  const changed = updateProjectDiscovery(
    original,
    { ...original.discovery, audience: "Gestores remotos" },
    "2026-10-23T11:00:00.000Z",
  );
  assert.equal(changed.diagnosis?.review?.status, "draft");
  assert.equal(changed.diagnosis?.review?.approvedAt, undefined);
  assert.equal(changed.diagnosis?.review?.version, 2);
  assert.equal(changed.diagnosisHistory?.[0].review?.status, "approved");
  assert.equal(original.diagnosis.review?.status, "approved");
  assert.deepEqual(changed.maps, original.maps);
  assert.deepEqual(changed.deliverables, original.deliverables);
  assert.throws(() =>
    approveDiagnosis(
      changed.diagnosis!,
      changed.discovery,
      "2026-10-23T11:00:00.000Z",
    ),
  );
});
test("stale tab snapshot cannot overwrite newer local data", () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
    },
  });
  try {
    const old = loadProjectSnapshot();
    const first = saveProjects([exampleProject], old.revision);
    assert.throws(() => saveProjects([], old.revision), StorageConflictError);
    assert.equal(loadProjectSnapshot().projects.length, 1);
    assert.equal(loadProjectSnapshot().revision, first);
    saveProjects([], first);
    assert.equal(loadProjectSnapshot().projects.length, 0);
  } finally {
    Reflect.deleteProperty(globalThis, "localStorage");
  }
});
test("local setup generates a private token once without printing or replacing human settings", () => {
  const dir = mkdtempSync(join(tmpdir(), "arquiteto-setup-"));
  const script = resolve("scripts/prepare-local-env.mjs");
  const options = {
    cwd: dir,
    env: { ...process.env, DIAGNOSIS_ACCESS_TOKEN: "" },
    encoding: "utf8" as const,
  };
  try {
    const first = spawnSync(process.execPath, [script], options);
    assert.equal(first.status, 0);
    const content = readFileSync(join(dir, ".env.local"), "utf8");
    const token = content.match(/DIAGNOSIS_ACCESS_TOKEN=([a-f0-9]{64})/)?.[1];
    assert.ok(token);
    assert.ok(!first.stdout.includes(token));
    assert.equal(statSync(join(dir, ".env.local")).mode & 0o777, 0o600);
    assert.equal(spawnSync(process.execPath, [script], options).status, 0);
    assert.equal(readFileSync(join(dir, ".env.local"), "utf8"), content);
    writeFileSync(
      join(dir, ".env.local"),
      "# Human configuration\nCUSTOM=value\n",
    );
    spawnSync(process.execPath, [script], options);
    assert.equal(
      readFileSync(join(dir, ".env.local"), "utf8"),
      "# Human configuration\nCUSTOM=value\n",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("status only reports local readiness, never credentials or external validation", async () => {
  const names = [
    "AI_PROVIDER_API_KEY",
    "OPENAI_API_KEY",
    "DIAGNOSIS_ACCESS_TOKEN",
  ] as const;
  const saved = names.map((n) => process.env[n]);
  try {
    names.forEach((n) => delete process.env[n]);
    assert.deepEqual(await GET().json(), { configured: false });
    process.env.AI_PROVIDER_API_KEY = "private-test-provider-key";
    process.env.DIAGNOSIS_ACCESS_TOKEN =
      "private-test-access-code-of-sufficient-length";
    const response = GET();
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { configured: true });
  } finally {
    names.forEach((n, i) => {
      if (saved[i] === undefined) delete process.env[n];
      else process.env[n] = saved[i];
    });
  }
});
