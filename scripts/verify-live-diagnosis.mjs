// One-shot operator harness. No secrets, requests or paid work before authorization.
import fs from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import { spawn } from "node:child_process";
import nextEnv from "@next/env";
import { chromium } from "@playwright/test";
const root = process.cwd();
const marker = "/tmp/arquiteto-live-analysis-v2-attempted";
if (process.env.LIVE_DIAGNOSIS_COST_AUTHORIZED !== "one-analysis-v2") {
  console.log(
    "Teste real preparado. Execução bloqueada até autorização explícita de custo.",
  );
  process.exit(2);
}
if (fs.existsSync(marker)) {
  console.log(
    "A tentativa autorizada já foi utilizada. Nenhuma nova chamada permitida.",
  );
  process.exit(2);
}
nextEnv.loadEnvConfig(root);
if (
  !(process.env.AI_PROVIDER_API_KEY || process.env.OPENAI_API_KEY) ||
  !process.env.DIAGNOSIS_ACCESS_TOKEN
) {
  console.log("Configuração segura incompleta.");
  process.exit(2);
}
const origin = "http://127.0.0.1:3102";
const server = spawn(
  process.execPath,
  [
    path.join(root, "node_modules/next/dist/bin/next"),
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3102",
  ],
  { cwd: root, env: { ...process.env, APP_ORIGIN: origin }, stdio: "ignore" },
);
let browser;
(async () => {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(origin + "/api/diagnosis/status");
      if (res.ok && (await res.json()).configured) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error("Servidor de validação não ficou disponível.");
  browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  let attempts = 0;
  await page.route("**/api/diagnosis", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const original = JSON.parse(
      fs.readFileSync(
        path.join(root, "docs/validation/phase2/diagnosis-original.json"),
        "utf8",
      ),
    );
    assert.deepEqual(
      route.request().postDataJSON().discovery,
      original.review.sourceDiscovery,
      "A descoberta deve ser idêntica à original.",
    );
    attempts++;
    if (attempts > 1) return route.abort();
    fs.writeFileSync(
      marker,
      "Uma tentativa autorizada foi iniciada. Não repetir sem nova autorização.\n",
      { flag: "wx", mode: 0o600 },
    );
    return route.continue();
  });
  await page.goto(origin);
  await page
    .getByRole("button", { name: "Explorar projeto demonstrativo" })
    .click();
  await page
    .getByLabel("Código de acesso ao diagnóstico")
    .fill(process.env.DIAGNOSIS_ACCESS_TOKEN);
  await page.getByRole("checkbox", { name: /Autorizo enviar/ }).check();
  const pending = page.waitForResponse(
    (response) =>
      response.url() === origin + "/api/diagnosis" &&
      response.request().method() === "POST",
    { timeout: 110000 },
  );
  await page
    .getByRole("button", { name: "Analisar com IA", exact: true })
    .click();
  const response = await pending;
  const payload = await response.json();
  if (!response.ok()) {
    fs.writeFileSync(
      "/tmp/arquiteto-live-v2-result.json",
      JSON.stringify({
        status: response.status(),
        error: payload.error,
        attempts,
      }),
      { mode: 0o600 },
    );
    throw new Error(
      "A tentativa retornou HTTP " + response.status() + ". Não será repetida.",
    );
  }
  const diagnosis = payload.diagnosis;
  // Preserve the sole paid result even if a later browser step fails.
  fs.writeFileSync(
    "/tmp/arquiteto-live-v2-result.json",
    JSON.stringify(
      {
        status: 200,
        attempts,
        diagnosis,
        workflow: {
          edited: false,
          draftSaved: false,
          reopened: false,
          approvalMechanism: false,
          approvalReopened: false,
        },
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  await page
    .getByRole("textbox", { name: "Justificativa da proposta" })
    .fill(
      (
        "Revisão técnica de funcionamento em projeto fictício; aprovação editorial permanece com o responsável pedagógico. " +
        (diagnosis.pedagogy?.rationale ?? diagnosis.rationale)
      ).slice(0, 1400),
    );
  if (diagnosis.pedagogy) {
    await page
      .getByRole("textbox", { name: "Justificativa da sua revisão" })
      .fill(
        "Verificação técnica do mecanismo em caso fictício; a avaliação pedagógica substantiva é registrada separadamente pelo responsável.",
      );
    await page
      .getByRole("checkbox", { name: /Revisei as sete dimensões/ })
      .check();
  }
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await page.getByText("Aguardando revisão humana", { exact: true }).waitFor();
  await page.reload();
  await page
    .getByRole("button", {
      name: "Feedback que desenvolve pessoas",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Aprovar diagnóstico", exact: true })
    .click();
  await page.getByText("Aprovado pelo especialista", { exact: true }).waitFor();
  await page.reload();
  await page
    .getByRole("button", {
      name: "Feedback que desenvolve pessoas",
      exact: true,
    })
    .click();
  await page.getByText("Aprovado pelo especialista", { exact: true }).waitFor();
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem("arquiteto.projects.v1")).projects[0],
  );
  if (
    stored.diagnosis.review.status !== "approved" ||
    !stored.diagnosis.review.editedByHuman ||
    attempts !== 1
  )
    throw new Error("Persistência/revisão não confirmada.");
  fs.writeFileSync(
    "/tmp/arquiteto-live-v2-result.json",
    JSON.stringify(
      {
        status: 200,
        attempts,
        diagnosis,
        workflow: {
          edited: true,
          draftSaved: true,
          reopened: true,
          approvalMechanism: true,
          approvalReopened: true,
        },
        historyLength: stored.diagnosisHistory.length,
        reviewedProject: stored,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    "Uma análise real concluída; edição, salvamento, aprovação de teste e reabertura confirmados. Resultado reservado para avaliação pedagógica.",
  );
})()
  .catch(() => {
    console.log(
      "Verificação interrompida; nenhum segredo será exibido e a chamada não será repetida automaticamente.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  });
