import { test, expect } from "@playwright/test";
import realProject from "../../docs/validation/phase2/reviewed-project.json";
const competencyReview = [
  "Descrever o atraso da entrega com situação e comportamento observáveis, sem atribuir intenção ou rotular a pessoa; evidência: fala registrada na simulação e conferida por checklist.",
  "Explicar o impacto concreto da entrega atrasada e formular uma pergunta aberta sobre as dificuldades; evidência: o observador identifica impacto e pergunta na conversa simulada.",
  "Ouvir a resposta, sintetizar o que compreendeu e confirmar a síntese com o interlocutor; evidência: síntese verbal seguida de confirmação, sem presumir concordância.",
  "Negociar um próximo passo com ação, responsável, prazo e acompanhamento; evidência: acordo registrado contendo os quatro elementos, sujeito à viabilidade do contexto.",
].join("\n");
test("the recorded real response supports substantive manual revision without another generation", async ({
  page,
}) => {
  let generationRequests = 0;
  await page.route("**/api/diagnosis", (route) => {
    generationRequests++;
    return route.abort();
  });
  await page.addInitScript((project) => {
    if (!localStorage.getItem("arquiteto.projects.v1"))
      localStorage.setItem(
        "arquiteto.projects.v1",
        JSON.stringify({ version: 1, projects: [project] }),
      );
  }, realProject);
  await page.goto("/");
  await page
    .getByRole("button", { name: realProject.title, exact: true })
    .click();
  await page
    .getByRole("textbox", { name: /Competências observáveis propostas/ })
    .fill(competencyReview);
  await page
    .getByRole("textbox", { name: "Justificativa da proposta" })
    .fill(
      "Revisão técnica proposta: evitar conflitos não comprova medo. Confirmar as causas com os participantes. A limitação de 60 minutos é uma restrição da oficina, não uma dificuldade cognitiva do aprendiz. As competências e evidências propostas devem ser validadas pelo responsável pedagógico.",
    );
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await expect(
    page.getByText("Aguardando revisão humana", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: realProject.title, exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: /Competências observáveis propostas/ }),
  ).toHaveValue(competencyReview);
  const stored = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0],
  );
  expect(stored.diagnosis.analysis.competencies).toHaveLength(4);
  expect(stored.diagnosis.analysis.competencies[0]).toContain("evidência:");
  expect(stored.diagnosis.review.status).toBe("draft");
  await page
    .getByRole("button", { name: "Aprovar diagnóstico", exact: true })
    .click();
  await expect(
    page.getByText("Aprovado pelo especialista", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: realProject.title, exact: true })
    .click();
  await expect(
    page.getByText("Aprovado pelo especialista", { exact: true }),
  ).toBeVisible();
  const approved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0],
  );
  expect(approved.diagnosis.review.editedByHuman).toBe(true);
  expect(approved.diagnosis.review.status).toBe("approved");
  expect(approved.diagnosis.analysis.competencies.join("\n")).toBe(
    competencyReview,
  );
  expect(generationRequests).toBe(0);
});
