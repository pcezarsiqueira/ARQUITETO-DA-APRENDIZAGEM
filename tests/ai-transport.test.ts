import { test } from "node:test";
import assert from "node:assert/strict";
import { EnvHttpProxyAgent } from "undici";
import { createOpenAIClient } from "../src/integrations/ai/client";
test("server SDK uses matching proxy transport, shared dispatcher, fixed destination and no retry", () => {
  const names = [
    "HTTPS_PROXY",
    "HTTP_PROXY",
    "https_proxy",
    "http_proxy",
  ] as const;
  const saved = names.map((name) => process.env[name]);
  try {
    names.forEach((name) => delete process.env[name]);
    const direct = createOpenAIClient("fake-test-key");
    assert.equal(direct.baseURL, "https://api.openai.com/v1");
    assert.equal(direct.maxRetries, 0);
    assert.equal(direct.timeout, 90000);
    assert.equal(direct.fetchOptions?.dispatcher, undefined);
    process.env.HTTPS_PROXY = "http://127.0.0.1:9";
    const first = createOpenAIClient("fake-test-key");
    const second = createOpenAIClient("fake-test-key");
    assert.ok(first.fetchOptions?.dispatcher instanceof EnvHttpProxyAgent);
    assert.equal(
      first.fetchOptions?.dispatcher,
      second.fetchOptions?.dispatcher,
    );
    assert.equal(first.maxRetries, 0);
  } finally {
    names.forEach((name, i) => {
      if (saved[i] === undefined) delete process.env[name];
      else process.env[name] = saved[i];
    });
  }
});

test("live browser runner refuses to spend without an explicit operational grant", async () => {
  const { spawnSync } = await import("node:child_process");
  const { resolve } = await import("node:path");
  const result = spawnSync(
    process.execPath,
    [resolve("scripts/verify-live-diagnosis.mjs")],
    {
      env: { ...process.env, LIVE_DIAGNOSIS_COST_AUTHORIZED: "" },
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 2);
  assert.match(result.stdout, /bloqueada até autorização explícita de custo/);
});

test("authorization for the first analysis cannot unlock the V2 live runner", async () => {
  const { spawnSync } = await import("node:child_process");
  const { resolve } = await import("node:path");
  const result = spawnSync(
    process.execPath,
    [resolve("scripts/verify-live-diagnosis.mjs")],
    {
      env: { ...process.env, LIVE_DIAGNOSIS_COST_AUTHORIZED: "one-analysis" },
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 2);
  assert.match(result.stdout, /bloqueada até autorização explícita de custo/);
});
