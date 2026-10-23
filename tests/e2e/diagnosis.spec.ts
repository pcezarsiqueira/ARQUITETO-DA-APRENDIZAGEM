import { test, expect } from "@playwright/test";
import { buildDiagnosis } from "../../src/domain/diagnosis";
const output = {
  priorKnowledge: ["Hipótese: distinguir fatos de julgamentos."],
  assumptions: ["O significado de feedback pode estar sendo presumido."],
  gaps: ["Investigar a formulação de acordos."],
  barriers: ["Receio de conflito pode interferir."],
  competencies: ["Descrever comportamento e combinar ação com prazo."],
  needsValidation: ["Qual é a experiência dos gestores?"],
  rationale:
    "Proposta baseada no cenário informado, sem pesquisa com aprendizes.",
};
test("review, edit, approve, reopen and detect stale discovery without losing legacy data", async ({
  page,
}) => {
  await page.route("**/api/diagnosis/status", (route) =>
    route.fulfill({ json: { configured: true } }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explorar projeto demonstrativo" })
    .click();
  const generate = page.getByRole("button", {
    name: "Analisar com IA",
    exact: true,
  });
  await expect(generate).toBeDisabled();
  const code = "test-access-code-with-more-than-32-characters";
  await page.getByLabel("Código de acesso ao diagnóstico").fill(code);
  await page.getByRole("checkbox", { name: /Autorizo enviar/ }).check();
  let seen = 0;
  await page.route("**/api/diagnosis", async (route) => {
    seen++;
    const body = route.request().postDataJSON();
    expect(body.consent).toBe(true);
    expect(body.costConsent).toBe(true);
    expect(Object.keys(body)).toEqual(["discovery", "consent", "costConsent"]);
    expect(route.request().headers().authorization).toBe(`Bearer ${code}`);
    await route.fulfill({
      json: {
        diagnosis: buildDiagnosis(
          output,
          body.discovery,
          "test-model",
          "2026-10-23T10:00:00.000Z",
        ),
      },
    });
  });
  await generate.click();
  await expect(page.getByRole("status")).toContainText("Proposta recebida");
  await expect(
    page.getByRole("checkbox", { name: /Autorizo enviar/ }),
  ).not.toBeChecked();
  await page
    .getByRole("textbox", { name: /Possíveis conhecimentos prévios/ })
    .fill("Hipótese revisada pelo especialista.");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Voltar aos projetos" }).click();
  await expect(
    page.getByRole("textbox", { name: /Possíveis conhecimentos prévios/ }),
  ).toHaveValue("Hipótese revisada pelo especialista.");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("link", { name: /Arquiteto/ }).click();
  await expect(
    page.getByRole("textbox", { name: /Possíveis conhecimentos prévios/ }),
  ).toHaveValue("Hipótese revisada pelo especialista.");
  await page.getByRole("textbox", { name: /Possíveis lacunas/ }).fill("\n");
  await page
    .getByRole("textbox", { name: /Possíveis conhecimentos prévios/ })
    .fill("Hipótese revisada pelo especialista.\n\n");
  await page
    .getByRole("button", { name: "Aprovar diagnóstico", exact: true })
    .click();
  await expect(
    page.getByText("Aprovado pelo especialista", { exact: true }),
  ).toBeVisible();
  expect(seen).toBe(1);
  const raw = await page.evaluate(() =>
    localStorage.getItem("arquiteto.projects.v1"),
  );
  expect(raw).not.toContain(code);
  const saved = JSON.parse(raw!).projects[0];
  expect(saved.diagnosis.review.status).toBe("approved");
  expect(saved.diagnosis.analysis.gaps).toEqual([]);
  expect(saved.diagnosisHistory[0].source).toBe("demonstration");
  expect(saved.diagnosis.analysis.priorKnowledge).toEqual([
    "Hipótese revisada pelo especialista.",
  ]);
  await page.reload();
  await page
    .getByRole("button", {
      name: "Feedback que desenvolve pessoas",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Aprovado pelo especialista", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Código de acesso ao diagnóstico")).toHaveValue(
    "",
  );
  await expect(
    page.getByRole("heading", {
      name: "Plano de aula · Conversas que desenvolvem",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar descoberta" }).click();
  await page
    .getByRole("textbox", { name: /Quem vai aprender/ })
    .fill("Gestores de equipes distribuídas");
  await page.getByRole("button", { name: "Salvar descoberta" }).click();
  await expect(
    page.getByText(/Desatualizado: a descoberta mudou/),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0]
          .diagnosis.review.status,
    ),
  ).toBe("draft");
  await expect(
    page.getByRole("button", { name: "Aprovar diagnóstico", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Código de acesso ao diagnóstico").fill(code);
  await page.getByRole("checkbox", { name: /Autorizo enviar/ }).check();
  await page.unroute("**/api/diagnosis");
  await page.route("**/api/diagnosis", (route) =>
    route.fulfill({ status: 429, json: { error: "Limite de uso atingido." } }),
  );
  await page.getByRole("button", { name: "Gerar nova proposta" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Limite de uso atingido" }),
  ).toContainText("Limite de uso atingido");
  await expect(
    page.getByRole("textbox", { name: /Possíveis conhecimentos prévios/ }),
  ).toHaveValue("Hipótese revisada pelo especialista.");
});

test("unconfigured production endpoint fails closed without provider access", async ({
  request,
}) => {
  const response = await request.post("/api/diagnosis", {
    headers: { origin: "http://127.0.0.1:3000" },
    data: { discovery: {}, consent: true },
  });
  expect(response.status()).toBe(503);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect((await response.json()).error).toContain("Configure a chave de API");
});

test("ordinary user creates a project and completes review with controlled AI", async ({
  page,
}) => {
  await page.route("**/api/diagnosis/status", (route) =>
    route.fulfill({ json: { configured: true } }),
  );
  await page.route("**/api/diagnosis", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.costConsent).toBe(true);
    expect(body.discovery.audience).toBe("Novos gestores de equipes");
    await route.fulfill({
      json: {
        diagnosis: buildDiagnosis(
          output,
          body.discovery,
          "controlled-test-model",
          "2026-10-23T10:00:00.000Z",
        ),
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Criar meu projeto" }).click();
  for (const [label, value] of [
    [/Qual conhecimento/, "Feedback construtivo"],
    [
      /O que o aprendiz/,
      "Conduzir uma conversa específica e combinar uma ação observável.",
    ],
    [/Quem vai aprender/, "Novos gestores de equipes"],
    [
      /O que esse público/,
      "Conhecem suas equipes e ainda não praticaram feedback.",
    ],
    [/Quais dificuldades/, "Adiam conversas difíceis."],
    [/Que histórias/, "Exemplo fictício de entrega atrasada."],
    [/Já tem uma modalidade/, "Oficina presencial"],
    [/Quais são os limites/, "60 minutos, duplas e roteiro impresso."],
  ] as const)
    await page.getByRole("textbox", { name: label }).fill(value);
  await page.getByRole("button", { name: "Salvar descoberta" }).click();
  await page
    .getByLabel("Código de acesso ao diagnóstico")
    .fill("controlled-test-access-code-not-a-real-secret");
  await page.getByRole("checkbox", { name: /Autorizo enviar/ }).check();
  await page
    .getByRole("button", { name: "Analisar com IA", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Proposta recebida");
  await expect(
    page.getByRole("checkbox", { name: /Autorizo enviar/ }),
  ).not.toBeChecked();
  await page
    .getByRole("textbox", { name: "Justificativa da proposta" })
    .fill(
      "Revisão humana: confirmar necessidades com os participantes antes de planejar a oficina.",
    );
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await expect(
    page.getByText("Aguardando revisão humana", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Feedback construtivo", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Justificativa da proposta" }),
  ).toHaveValue(
    "Revisão humana: confirmar necessidades com os participantes antes de planejar a oficina.",
  );
  await page
    .getByRole("button", { name: "Aprovar diagnóstico", exact: true })
    .click();
  await expect(
    page.getByText("Aprovado pelo especialista", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Feedback construtivo", exact: true })
    .click();
  await expect(
    page.getByText("Aprovado pelo especialista", { exact: true }),
  ).toBeVisible();
});
