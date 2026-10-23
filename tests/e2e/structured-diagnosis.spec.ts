import { test, expect } from "@playwright/test";
import projectFixture from "../../docs/validation/phase2/reviewed-project.json";
import revision from "../../docs/validation/phase2/technical-revision-v2.json";
import { buildDiagnosis } from "../../src/domain/diagnosis";
import { pedagogicalOutputSchema } from "../../src/domain/pedagogical-analysis";
test("V2 proposal is editable, rejectable, expandable and human-reviewed before approval", async ({
  page,
}) => {
  await page.route("**/api/diagnosis/status", (route) =>
    route.fulfill({ json: { configured: true } }),
  );
  let generationRequests = 0;
  await page.route("**/api/diagnosis", (route) => {
    generationRequests++;
    const body = route.request().postDataJSON();
    return route.fulfill({
      json: {
        diagnosis: buildDiagnosis(
          pedagogicalOutputSchema.parse(revision.pedagogy),
          body.discovery,
          "controlled-V2-test",
          new Date().toISOString(),
        ),
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explorar projeto demonstrativo" })
    .click();
  await page
    .getByLabel("Código de acesso ao diagnóstico")
    .fill("controlled-test-access-code-long-enough");
  await page.getByRole("checkbox", { name: /Autorizo enviar/ }).check();
  await page
    .getByRole("button", { name: "Analisar com IA", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Proposta recebida");
  const approve = page.getByRole("button", {
    name: "Aprovar diagnóstico",
    exact: true,
  });
  await expect(approve).toBeDisabled();
  const first = page.getByRole("group", { name: "Competência 1", exact: true });
  const edited =
    "Descrever situação e comportamento sem rotular a pessoa, conferindo o episódio com o interlocutor.";
  await first
    .getByRole("textbox", { name: "Ação observável", exact: true })
    .fill(edited);
  await page
    .getByText("Ideias a verificar sobre a aprendizagem (3)", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Rejeitar hipótese 3", exact: true })
    .click();
  await expect(
    page.getByText("Itens rejeitados e preservados (1)"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Complementar: competência", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Competência 4", exact: true }),
  ).toBeVisible();
  await expect(approve).toBeDisabled();
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: projectFixture.title, exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Competência 4", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Rejeitar competência 4", exact: true })
    .click();
  const note =
    "Conferi a fundamentação, a incerteza e os critérios de desempenho no contexto fictício de 60 minutos.";
  await page
    .getByRole("textbox", { name: "Justificativa da sua revisão", exact: true })
    .fill(note);
  await page
    .getByRole("checkbox", { name: /Revisei as sete dimensões/ })
    .check();
  await expect(approve).toBeEnabled();
  await approve.click();
  await expect(
    page.getByText("Aprovado pelo especialista", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: projectFixture.title, exact: true })
    .click();
  await expect(
    page
      .getByRole("group", { name: "Competência 1", exact: true })
      .getByRole("textbox", { name: "Ação observável", exact: true }),
  ).toHaveValue(edited);
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0],
  );
  expect(saved.diagnosis.pedagogy.competencies[0].action).toBe(edited);
  expect(saved.diagnosis.generatedPedagogy.competencies[0].action).toBe(
    revision.pedagogy.competencies[0].action,
  );
  expect(saved.diagnosis.rejectedItems).toHaveLength(2);
  expect(
    saved.diagnosis.review.pedagogicalReview.reviewedCriteria,
  ).toHaveLength(7);
  expect(generationRequests).toBe(1);
  await page
    .getByRole("group", { name: "Competência 1", exact: true })
    .getByRole("textbox", { name: "Como observar o desempenho?", exact: true })
    .fill("");
  await expect(
    page.getByRole("checkbox", { name: /Revisei as sete dimensões/ }),
  ).not.toBeChecked();
  await expect(approve).toBeDisabled();
});
test("legacy adaptation preserves original history and can be saved incomplete without calling AI", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/diagnosis", (route) => {
    requests++;
    return route.abort();
  });
  await page.addInitScript((project) => {
    if (!localStorage.getItem("arquiteto.projects.v1"))
      localStorage.setItem(
        "arquiteto.projects.v1",
        JSON.stringify({ version: 1, projects: [project] }),
      );
  }, projectFixture);
  await page.goto("/");
  await page
    .getByRole("button", { name: projectFixture.title, exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Organizar registro antigo, sem IA",
      exact: true,
    })
    .click();
  await expect(page.getByText(/Origem: adaptação técnica/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Aprovar diagnóstico", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: projectFixture.title, exact: true })
    .click();
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0],
  );
  expect(saved.diagnosis.pedagogyOrigin).toBe("technical_adaptation");
  expect(saved.diagnosis.pedagogy.competencies[0].performanceEvidence).toBe("");
  expect(saved.diagnosisHistory.at(-1).analysis).toEqual(
    projectFixture.diagnosis.analysis,
  );
  expect(requests).toBe(0);
});

test("demonstrative legacy diagnosis can also be organized without changing maps or deliverables", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/diagnosis", (route) => {
    requests++;
    return route.abort();
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explorar projeto demonstrativo" })
    .click();
  const before = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0],
  );
  await page
    .getByRole("button", {
      name: "Organizar registro antigo, sem IA",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Aprovar diagnóstico", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  const after = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0],
  );
  expect(after.maps).toEqual(before.maps);
  expect(after.deliverables).toEqual(before.deliverables);
  expect(after.diagnosisHistory.at(-1)).toEqual(before.diagnosis);
  expect(after.diagnosis.pedagogyOrigin).toBe("technical_adaptation");
  expect(requests).toBe(0);
});
