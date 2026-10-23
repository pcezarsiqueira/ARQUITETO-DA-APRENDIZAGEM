import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import realDiagnosis from "../../docs/validation/phase2/v2-real/diagnosis-original.json";
import liveProject from "../../docs/validation/phase2/v2-real/reviewed-project-live.json";

// Replay only a preserved response. Every generation endpoint is blocked.
test("real V2 result supports editing, rejection, supplementation and explicit approval without generation", async ({
  page,
}, testInfo) => {
  const project = {
    ...liveProject,
    diagnosis: realDiagnosis,
    diagnosisHistory: [],
  };
  let requests = 0;
  await page.route("**/api/diagnosis", (route) => {
    requests++;
    return route.abort();
  });
  await page.addInitScript((initial) => {
    if (!localStorage.getItem("arquiteto.projects.v1"))
      localStorage.setItem(
        "arquiteto.projects.v1",
        JSON.stringify({ version: 1, projects: [initial] }),
      );
  }, project);
  const open = () =>
    page.getByRole("button", { name: project.title, exact: true }).click();
  const save = () =>
    page.getByRole("button", { name: "Salvar revisão", exact: true }).click();
  const stored = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0],
    );
  await page.goto("/");
  await open();
  const approve = page.getByRole("button", {
    name: "Aprovar diagnóstico",
    exact: true,
  });
  await expect(approve).toBeDisabled();
  const competency = page.getByRole("group", {
    name: "Competência 1",
    exact: true,
  });
  const action =
    "Descrever o atraso com fatos, ouvir e confirmar a compreensão do interlocutor e combinar um próximo passo, sem rotular a pessoa.";
  await competency
    .getByRole("textbox", { name: "Ação observável", exact: true })
    .fill(action);
  await competency
    .getByRole("textbox", { name: "Como observar o desempenho?", exact: true })
    .fill(
      "Fala na simulação e acordo escrito: o parceiro identifica situação, comportamento, escuta com confirmação e próximo passo negociado.",
    );
  await competency
    .getByRole("textbox", { name: "O que conta como sucesso?", exact: true })
    .fill(
      "Descrição sem atribuir intenção; pergunta aberta e confirmação da resposta; acordo com ação, responsável e forma de acompanhamento definida entre as partes.",
    );
  await competency
    .getByRole("textbox", {
      name: "Por que esse critério faz sentido?",
      exact: true,
    })
    .fill(
      "São sinais observáveis das qualidades informadas no objetivo: especificidade, respeito e construção de acordos. São critérios locais propostos para revisão, sem alegar eficácia comprovada.",
    );
  await competency
    .getByRole("textbox", {
      name: "Relação com o objetivo principal",
      exact: true,
    })
    .fill(
      "Torna verificáveis os componentes de uma conversa específica, respeitosa e orientada a acordos, sem ampliar para mediação geral de conflitos.",
    );
  await competency
    .getByRole("combobox", { name: "Cabe no contexto informado?", exact: true })
    .selectOption("needs_validation");
  await competency
    .getByRole("textbox", { name: "Justificativa de viabilidade", exact: true })
    .fill(
      "Faltam tamanho da turma e tempo reservado para prática, troca de papéis e devolutiva; os 60 minutos não comprovam viabilidade por si sós.",
    );
  await expect(approve).toBeDisabled();
  // Reject a question that assumes previous simulation-based instruction.
  await page
    .getByRole("button", { name: "Rejeitar pergunta 4", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complementar: pergunta", exact: true })
    .click();
  const question = page.getByRole("group", { name: "Pergunta 4", exact: true });
  const fields = [
    [
      "Pergunta ao especialista ou ao público",
      "Quantos participantes haverá e quanto dos 60 minutos será reservado para prática, troca de papéis e devolutiva?",
    ],
    [
      "Qual informação falta?",
      "Tamanho da turma e tempo efetivamente disponível para os componentes da prática.",
    ],
    [
      "Por que precisamos saber?",
      "Para verificar se cada participante terá oportunidade de praticar e receber uma devolutiva.",
    ],
    [
      "Como a resposta mudaria a decisão?",
      "Ajustar o escopo da simulação, alternar papéis e reservar devolutiva; se o tempo não permitir, reduzir o objetivo sem prometer domínio da conversa completa.",
    ],
  ];
  for (const [name, value] of fields)
    await question.getByRole("textbox", { name, exact: true }).fill(value);
  await question
    .getByRole("combobox", { name: "Qual decisão pode mudar?", exact: true })
    .selectOption("activities");
  await question
    .getByRole("combobox", { name: "Prioridade", exact: true })
    .selectOption("high");
  await page
    .getByRole("textbox", { name: "Justificativa da proposta", exact: true })
    .fill(
      "Revisão técnica da resposta real V2: a relação entre dificuldade e causa permanece hipotética. Não há evidência de treinamento anterior, de falta de recursos digitais ou de um planejamento que garanta a prática completa em 60 minutos. Esta cópia registra correções para teste e não aprova pedagogicamente a Fase 2.",
    );
  await save();
  await page.reload();
  await open();
  await expect(
    competency.getByRole("textbox", { name: "Ação observável", exact: true }),
  ).toHaveValue(action);
  await expect(
    competency.getByRole("combobox", {
      name: "Cabe no contexto informado?",
      exact: true,
    }),
  ).toHaveValue("needs_validation");
  const draft = await stored();
  expect(draft.diagnosis.review.status).toBe("draft");
  expect(draft.diagnosis.rejectedItems).toHaveLength(1);
  expect(JSON.parse(draft.diagnosis.rejectedItems[0].data)).toEqual(
    realDiagnosis.pedagogy.questions[3],
  );
  expect(draft.diagnosis.pedagogy.questions[3].question).toContain(
    "Quantos participantes",
  );
  // A separate hypothetical condition tests approval; it is NOT evidence about the real workshop.
  await competency
    .getByRole("combobox", { name: "Cabe no contexto informado?", exact: true })
    .selectOption("feasible");
  await competency
    .getByRole("textbox", { name: "Justificativa de viabilidade", exact: true })
    .fill(
      "EXCLUSIVAMENTE NO TESTE FICTÍCIO: o operador assume tempo para uma rodada com troca de papéis e devolutiva. Esta condição não foi informada pelo especialista, não valida a oficina real e exige confirmação antes do uso pedagógico.",
    );
  await expect(approve).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Justificativa da sua revisão", exact: true })
    .fill(
      "Aprovação automatizada apenas para testar o mecanismo e a persistência em cópia fictícia. As sete dimensões foram avaliadas criticamente no relatório; não é aprovação pedagógica do produto ou confirmação da viabilidade real.",
    );
  await page
    .getByRole("checkbox", { name: /Revisei as sete dimensões/ })
    .check();
  await expect(approve).toBeEnabled();
  await approve.click();
  await page.reload();
  await open();
  await expect(
    page.getByText("Aprovado pelo especialista", { exact: true }),
  ).toBeVisible();
  const approved = await stored();
  expect(approved.diagnosis.review.status).toBe("approved");
  expect(approved.diagnosis.review.editedByHuman).toBe(true);
  expect(approved.diagnosis.generatedPedagogy).toEqual(realDiagnosis.pedagogy);
  expect(approved.discovery).toEqual(realDiagnosis.review.sourceDiscovery);
  expect(approved.maps).toEqual(project.maps);
  expect(approved.deliverables).toEqual(project.deliverables);
  expect(
    approved.diagnosisHistory.some(
      (d: unknown) => JSON.stringify(d) === JSON.stringify(realDiagnosis),
    ),
  ).toBe(true);
  const record = testInfo.outputPath("reviewed-project.json");
  writeFileSync(record, JSON.stringify(approved, null, 2) + "\n");
  await testInfo.attach("reviewed-project", {
    path: record,
    contentType: "application/json",
  });
  expect(requests).toBe(0);
  await competency
    .getByRole("textbox", { name: "Ação observável", exact: true })
    .fill(action + " Revisão adicional de teste.");
  await expect(
    page.getByRole("checkbox", { name: /Revisei as sete dimensões/ }),
  ).not.toBeChecked();
  await save();
  await page.reload();
  await open();
  expect((await stored()).diagnosis.review.status).toBe("draft");
  expect(requests).toBe(0);
});
