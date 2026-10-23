import { test, expect } from "@playwright/test";
import { exampleProject } from "../../src/domain/example";
import real from "../../docs/validation/phase2/v2-real/diagnosis-original.json";
import { offlineDiagnosis } from "../fixtures/consistency-cases";

test("technical objective traceability, human review, pilot readiness and invalidation persist without AI", async ({
  page,
}) => {
  const { diagnosis, discovery } = offlineDiagnosis();
  const project = {
    ...exampleProject,
    id: "offline-network",
    title: discovery.subject,
    discovery,
    diagnosis,
    demonstration: false,
  };
  let calls = 0;
  await page.route("**/api/diagnosis", (r) => {
    calls++;
    return r.abort();
  });
  await page.addInitScript((p) => {
    if (!localStorage.getItem("arquiteto.projects.v1"))
      localStorage.setItem(
        "arquiteto.projects.v1",
        JSON.stringify({ version: 1, projects: [p] }),
      );
  }, project);
  const open = () =>
    page.getByRole("button", { name: project.title, exact: true }).click();
  await page.goto("/");
  await open();
  const panel = page.getByRole("region", {
    name: "Conferência de consistência pedagógica",
  });
  await panel
    .getByRole("button", { name: "Iniciar conferência sem IA", exact: true })
    .click();
  for (let i = 1; i <= 2; i++) {
    const cap = panel.getByRole("group", {
      name: `Capacidade ${i}`,
      exact: true,
    });
    await cap
      .getByRole("combobox", { name: "Competência relacionada", exact: true })
      .selectOption("0");
    await cap
      .getByLabel("Trecho da evidência que demonstra esta capacidade", {
        exact: true,
      })
      .fill(diagnosis.pedagogy!.competencies[0].performanceEvidence);
    await cap
      .getByLabel("Trecho do critério que permite julgar o desempenho", {
        exact: true,
      })
      .fill(diagnosis.pedagogy!.competencies[0].successCriterion);
    await cap
      .getByLabel("Por que esses trechos demonstram o resultado?", {
        exact: true,
      })
      .fill(
        i === 1
          ? "A configuração registrada mostra os endereços atribuídos conforme a condição do laboratório."
          : "O teste documentado mostra a resposta do destino e permite conferir a conectividade solicitada.",
      );
    await cap
      .getByRole("combobox", {
        name: "Minha avaliação da relação",
        exact: true,
      })
      .selectOption("supported_by_human");
  }
  await panel
    .getByRole("checkbox", { name: /Conferi que a lista contempla/ })
    .check();
  await panel
    .getByLabel("O que investiguei e o que ainda não sabemos", { exact: true })
    .fill(
      "Investigar o significado de rede local, a leitura dos resultados e os passos implícitos da configuração, sem presumir familiaridade do público.",
    );
  await panel
    .getByRole("checkbox", { name: /Revisei os pressupostos pertinentes/ })
    .check();
  await panel
    .getByLabel("Limitações e condições para o piloto assistido", {
      exact: true,
    })
    .fill(
      "Uso em laboratório fictício com acompanhamento; verificar conhecimentos prévios e não alegar eficácia ou generalização para redes de produção.",
    );
  await panel
    .getByRole("checkbox", { name: /Revisei a rastreabilidade/ })
    .check();
  await page
    .getByRole("textbox", { name: "Justificativa da sua revisão", exact: true })
    .fill(
      "Conferi as sete dimensões no contexto didático, com limitações registradas e sem prometer eficácia de aprendizagem.",
    );
  await page
    .getByRole("checkbox", { name: /Revisei as sete dimensões/ })
    .check();
  await page
    .getByRole("button", { name: "Aprovar diagnóstico", exact: true })
    .click();
  await expect(
    panel.getByText(
      "Revisão registrada para piloto assistido, com limites — sem garantia de eficácia.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.reload();
  await open();
  await expect(
    panel.getByText(
      "Revisão registrada para piloto assistido, com limites — sem garantia de eficácia.",
      { exact: true },
    ),
  ).toBeVisible();
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0],
  );
  expect(saved.diagnosis.consistency.links).toHaveLength(2);
  expect(saved.diagnosis.generatedPedagogy).toEqual(
    diagnosis.generatedPedagogy,
  );
  expect(saved.maps).toEqual(project.maps);
  const firstCapability = panel.getByRole("group", {
    name: "Capacidade 1",
    exact: true,
  });
  await firstCapability
    .getByRole("textbox", { name: "Resultado esperado", exact: true })
    .fill("Configurar uma rede local em laboratório didático");
  await expect(
    firstCapability.getByRole("combobox", {
      name: "Minha avaliação da relação",
      exact: true,
    }),
  ).toHaveValue("pending");
  await firstCapability
    .getByRole("combobox", { name: "Competência relacionada", exact: true })
    .selectOption("");
  await expect(
    firstCapability.getByRole("textbox", {
      name: "Trecho da evidência que demonstra esta capacidade",
      exact: true,
    }),
  ).toHaveValue("");
  await page
    .getByRole("group", { name: "Competência 1", exact: true })
    .getByRole("textbox", { name: "Como observar o desempenho?", exact: true })
    .fill("Uma nova evidência escrita para conferir manualmente.");
  await expect(panel.getByText(/O diagnóstico mudou/)).toBeVisible();
  await expect(
    panel.getByText("Ainda não está revisado para piloto assistido.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await page.reload();
  await open();
  await expect(panel.getByText(/O diagnóstico mudou/)).toBeVisible();
  expect(calls).toBe(0);
});

test("known V2 gaps allow pending investigation and justified retention without certifying coverage", async ({
  page,
}) => {
  const project = { ...exampleProject, diagnosis: real };
  await page.addInitScript((p) => {
    if (!localStorage.getItem("arquiteto.projects.v1"))
      localStorage.setItem(
        "arquiteto.projects.v1",
        JSON.stringify({ version: 1, projects: [p] }),
      );
  }, project);
  await page.goto("/");
  await page.getByRole("button", { name: project.title, exact: true }).click();
  const panel = page.getByRole("region", {
    name: "Conferência de consistência pedagógica",
  });
  await panel
    .getByRole("button", { name: "Iniciar conferência sem IA", exact: true })
    .click();
  const gap = panel.getByRole("group", {
    name: "O objetivo pede acordos: onde o aprendiz os demonstra?",
    exact: true,
  });
  await gap
    .getByRole("combobox", { name: "Decisão sobre este alerta", exact: true })
    .selectOption("investigate");
  await gap
    .getByLabel("Justificativa ou informação a investigar", { exact: true })
    .fill(
      "Precisamos definir qual acordo será demonstrado e como observar responsabilidade e acompanhamento.",
    );
  const feasibility = panel.getByRole("group", {
    name: "Viabilidade da competência 1 exige fundamento",
    exact: true,
  });
  await feasibility
    .getByRole("combobox", { name: "Decisão sobre este alerta", exact: true })
    .selectOption("keep");
  await feasibility
    .getByLabel("Justificativa ou informação a investigar", { exact: true })
    .fill(
      "Manter somente como hipótese de planejamento para revisão assistida, sem comprovar que cabe na oficina real.",
    );
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: project.title, exact: true }).click();
  await expect(
    gap.getByRole("combobox", {
      name: "Decisão sobre este alerta",
      exact: true,
    }),
  ).toHaveValue("investigate");
  await expect(
    feasibility.getByRole("combobox", {
      name: "Decisão sobre este alerta",
      exact: true,
    }),
  ).toHaveValue("keep");
  await expect(
    panel.getByText("Ainda não está revisado para piloto assistido.", {
      exact: true,
    }),
  ).toBeVisible();
  await panel
    .getByText("Verificação ou sugestão opcional com IA", { exact: true })
    .click();
  await expect(panel.getByText(/Desativada neste ambiente/)).toBeVisible();
  await expect(
    panel.getByRole("button", {
      name: "Solicitar sugestão de melhoria",
      exact: true,
    }),
  ).toBeDisabled();
});

test("optional assisted suggestion needs fresh cost consent and never overwrites the human diagnosis", async ({
  page,
}) => {
  const { diagnosis, discovery } = offlineDiagnosis();
  const project = {
    ...exampleProject,
    id: "offline-suggestion",
    title: discovery.subject,
    discovery,
    diagnosis,
  };
  let count = 0;
  await page.route("**/api/pedagogical-review", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { configured: true } });
    count++;
    expect(route.request().postDataJSON().costConsent).toBe(true);
    expect(route.request().postDataJSON().purpose).toBe("suggest");
    return route.fulfill({
      json: {
        model: "controlled-test-model",
        output: {
          findings: [
            {
              target: "objective",
              issue: "Sugestão controlada",
              reason: "Conferir o teste de conexão.",
              suggestion: "Explique como o resultado será observado.",
              uncertainty: "Exige revisão humana.",
            },
          ],
          limitations: "Transporte controlado, sem chamada real.",
        },
      },
    });
  });
  await page.addInitScript((p) => {
    if (!localStorage.getItem("arquiteto.projects.v1"))
      localStorage.setItem(
        "arquiteto.projects.v1",
        JSON.stringify({ version: 1, projects: [p] }),
      );
  }, project);
  await page.goto("/");
  await page.getByRole("button", { name: project.title, exact: true }).click();
  const panel = page.getByRole("region", {
    name: "Conferência de consistência pedagógica",
  });
  await panel
    .getByRole("button", { name: "Iniciar conferência sem IA", exact: true })
    .click();
  await panel
    .getByText("Verificação ou sugestão opcional com IA", { exact: true })
    .click();
  await panel
    .getByLabel("Código de acesso à verificação", { exact: true })
    .fill("controlled-test-review-access-code");
  const button = panel.getByRole("button", {
    name: "Solicitar sugestão de melhoria",
    exact: true,
  });
  await expect(button).toBeDisabled();
  await panel
    .getByRole("checkbox", { name: /Autorizo o envio dos dados desta revisão/ })
    .check();
  await button.click();
  await expect(panel.getByText(/Proposta de revisão recebida/)).toBeVisible();
  await expect(button).toBeDisabled();
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: project.title, exact: true }).click();
  const stored = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0],
  );
  expect(stored.diagnosis.pedagogy).toEqual(diagnosis.pedagogy);
  expect(stored.diagnosis.consistency.aiReports).toHaveLength(1);
  expect(JSON.stringify(stored)).not.toContain(
    "controlled-test-review-access-code",
  );
  expect(count).toBe(1);
});
