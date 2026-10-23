import { test, expect } from "@playwright/test";
import { exampleProject } from "../../src/domain/example";
import { createMap, saveMapRevision } from "../../src/domain/map-operations";
import { diagnosisSchema } from "../../src/domain/diagnosis";
import real from "../../docs/validation/phase2/v2-real/diagnosis-original.json";
import type { Project } from "../../src/domain/models";
const originTitle = exampleProject.title;
async function seed(page: import("@playwright/test").Page, project: Project) {
  await page.addInitScript((p) => {
    if (!localStorage.getItem("arquiteto.projects.v1"))
      localStorage.setItem(
        "arquiteto.projects.v1",
        JSON.stringify({ version: 1, projects: [p] }),
      );
  }, project);
  await page.goto("/");
  await page.getByRole("button", { name: project.title, exact: true }).click();
}
function reviewedProject() {
  const p = structuredClone(exampleProject),
    m = createMap(p, "legacy_map", "2026-10-23T16:00:00.000Z");
  m.nodes = m.nodes.map((n) => ({
    ...n,
    review: {
      accepted: true,
      note: "Conferido como proposta em um caso fictício; não comprova hipóteses.",
    },
  }));
  const c = m.nodes.find((n) => n.type === "competency")!;
  c.condition = "Diante do caso fictício de atraso, em simulação em dupla.";
  c.dependencyJustification =
    "O roteiro fornece o contexto; os dados da situação são disponibilizados para o exercício.";
  m.approval.note =
    "Conferi a progressão, as evidências e os critérios, mantendo as hipóteses explícitas no caso fictício.";
  p.visualMap = saveMapRevision(p, m, "2026-10-23T16:00:00.000Z");
  return p;
}
test("visual map adapts the feedback example, edits, moves, connects, disconnects and reopens without touching originals", async ({
  page,
}, info) => {
  let generations = 0;
  await page.route("**/api/diagnosis", (r) => {
    generations++;
    return r.abort();
  });
  await page.route("**/api/pedagogical-review", (r) =>
    r.request().method() === "POST" ? r.abort() : r.continue(),
  );
  await seed(page, structuredClone(exampleProject));
  const map = page.getByRole("region", {
    name: "Editor do mapa de transformação",
  });
  await expect(
    map.getByRole("button", {
      name: "Construir do diagnóstico aprovado",
      exact: true,
    }),
  ).toBeDisabled();
  await map
    .getByRole("button", {
      name: "Adaptar mapa editorial existente",
      exact: true,
    })
    .click();
  const inspector = map.getByRole("complementary", {
    name: "Editar elemento do mapa",
  });
  await expect(
    inspector.getByRole("textbox", {
      name: "Conteúdo do elemento",
      exact: true,
    }),
  ).toHaveValue(exampleProject.maps[0].objectives[0].behavior);
  await inspector
    .getByRole("textbox", { name: "Condição de desempenho", exact: true })
    .fill(
      "Diante do caso fictício de atraso, em uma conversa simulada em dupla.",
    );
  await inspector
    .getByRole("textbox", {
      name: "Se não houver dependência adicional, por quê?",
      exact: true,
    })
    .fill(
      "Os dados e o roteiro são fornecidos na atividade; investigar se a distinção entre fato e julgamento precisa de explicação prévia.",
    );
  await inspector
    .getByRole("button", { name: "Mover elemento: Direita", exact: true })
    .click();
  await map
    .getByRole("combobox", { name: "Adicionar ao mapa", exact: true })
    .selectOption("decision");
  await map
    .getByRole("button", { name: "Adicionar elemento", exact: true })
    .click();
  const decision = "Escolher um próximo passo negociado para o atraso";
  await inspector
    .getByRole("textbox", { name: "Conteúdo do elemento", exact: true })
    .fill(decision);
  await inspector
    .getByRole("textbox", {
      name: "Explicação ou pergunta de investigação",
      exact: true,
    })
    .fill(
      "Confirmar ação, responsabilidade e acompanhamento, sem presumir concordância.",
    );
  await map
    .getByRole("button", { name: "Salvar versão do mapa", exact: true })
    .click();
  let stored = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0],
  );
  const revision = stored.visualMap.revisions.at(-1),
    decisionId = revision.nodes.find(
      (n: { title: string }) => n.title === decision,
    ).id,
    competenceId = revision.nodes.find(
      (n: { type: string }) => n.type === "competency",
    ).id;
  expect(revision.version).toBe(2);
  expect(
    revision.nodes.find((n: { type: string }) => n.type === "competency").x,
  ).toBe(645);
  await map
    .getByRole("combobox", { name: "Elemento de origem", exact: true })
    .selectOption(decisionId);
  await map
    .getByRole("combobox", { name: "Elemento de destino", exact: true })
    .selectOption(competenceId);
  await map
    .getByRole("combobox", { name: "Tipo de conexão", exact: true })
    .selectOption("supports");
  await map
    .getByRole("textbox", {
      name: "Por que estes elementos estão relacionados?",
      exact: true,
    })
    .fill(
      "A negociação do próximo passo contribui para demonstrar a conversa orientada a acordos.",
    );
  await map
    .getByRole("button", { name: "Conectar elementos", exact: true })
    .click();
  await map
    .getByRole("button", { name: "Salvar versão do mapa", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: originTitle, exact: true }).click();
  stored = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0],
  );
  expect(stored.maps).toEqual(exampleProject.maps);
  expect(stored.diagnosis).toEqual(exampleProject.diagnosis);
  expect(stored.deliverables).toEqual(exampleProject.deliverables);
  expect(stored.visualMap.revisions).toHaveLength(2);
  const edge = stored.visualMap.revisions
    .at(-1)
    .edges.find((e: { from: string }) => e.from === decisionId);
  await expect(
    map.getByRole("button", { name: `Desconectar ${edge.id}`, exact: true }),
  ).toBeVisible();
  await map
    .getByRole("button", { name: `Desconectar ${edge.id}`, exact: true })
    .click();
  await map
    .getByRole("button", { name: "Salvar versão do mapa", exact: true })
    .click();
  const skillId = stored.visualMap.revisions
    .at(-1)
    .nodes.find((n: { type: string }) => n.type === "skill").id;
  await map
    .getByRole("combobox", { name: "Elemento de origem", exact: true })
    .selectOption(skillId);
  await map
    .getByRole("combobox", { name: "Elemento de destino", exact: true })
    .selectOption(competenceId);
  await map
    .getByRole("combobox", { name: "Tipo de conexão", exact: true })
    .selectOption("supports");
  await map
    .getByRole("textbox", {
      name: "Por que estes elementos estão relacionados?",
      exact: true,
    })
    .fill(
      "Reescrever julgamentos como observações contribui para a especificidade e o respeito na conversa.",
    );
  await map
    .getByRole("button", { name: "Conectar elementos", exact: true })
    .click();
  await map
    .getByRole("button", { name: "Visão espacial", exact: true })
    .click();
  await map
    .getByRole("combobox", { name: "Zoom do mapa", exact: true })
    .selectOption("0.6");
  await map
    .getByRole("button", { name: "Organizar por etapas", exact: true })
    .click();
  await map
    .getByRole("button", { name: "Salvar versão do mapa", exact: true })
    .click();
  if (info.project.name === "desktop") {
    await page.setViewportSize({ width: 1900, height: 1150 });
    await map
      .getByRole("button")
      .filter({ hasText: exampleProject.maps[0].objectives[0].behavior })
      .click();
    await page.evaluate(() =>
      document
        .getElementById("mapa-transformacao")!
        .scrollIntoView({ block: "start" }),
    );
    await page.screenshot({ path: info.outputPath("map-desktop.png") });
  } else {
    await map
      .getByRole("button", { name: "Lista acessível", exact: true })
      .click();
    await map
      .getByRole("button")
      .filter({ hasText: exampleProject.maps[0].objectives[0].behavior })
      .click();
    await expect(inspector).toBeFocused();
    await map
      .getByText(
        "A mesma estrutura em lista. Selecione um elemento para editar; conexões e posições permanecem preservadas.",
        { exact: true },
      )
      .evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: info.outputPath("map-mobile.png") });
    await inspector.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: info.outputPath("map-mobile-editor.png") });
  }
  expect(generations).toBe(0);
});

test("human map approval, history restore and subsequent content edits withdraw approval", async ({
  page,
}) => {
  const p = reviewedProject();
  await seed(page, p);
  const map = page.getByRole("region", {
    name: "Editor do mapa de transformação",
  });
  await expect(
    map.getByRole("button", {
      name: "Aprovar mapa e salvar versão",
      exact: true,
    }),
  ).toBeEnabled();
  await map
    .getByRole("button", { name: "Aprovar mapa e salvar versão", exact: true })
    .click();
  await expect(
    map.getByText("Versão 3 · aprovada", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: originTitle, exact: true }).click();
  await expect(
    map.getByText("Versão 3 · aprovada", { exact: true }),
  ).toBeVisible();
  await map
    .getByRole("button", { name: "Lista acessível", exact: true })
    .click();
  await map
    .getByRole("button", { name: /Gestor descreve uma situação/ })
    .click();
  const inspector = map.getByRole("complementary", {
    name: "Editar elemento do mapa",
  });
  await inspector
    .getByRole("textbox", { name: "Conteúdo do elemento", exact: true })
    .fill("Estado desejado revisado pelo especialista.");
  await expect(
    map.getByRole("button", {
      name: "Aprovar mapa e salvar versão",
      exact: true,
    }),
  ).toBeDisabled();
  await map
    .getByRole("button", { name: "Salvar versão do mapa", exact: true })
    .click();
  await map
    .getByText("Histórico de versões do mapa (3)", { exact: true })
    .click();
  await map
    .getByRole("combobox", {
      name: "Versão a restaurar como nova proposta",
      exact: true,
    })
    .selectOption("2");
  await map
    .getByRole("button", { name: "Restaurar como nova versão", exact: true })
    .click();
  const stored = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0],
  );
  expect(stored.visualMap.revisions).toHaveLength(4);
  expect(stored.visualMap.revisions[1].approval.status).toBe("approved");
  expect(stored.visualMap.revisions.at(-1).approval.status).toBe("draft");
  expect(
    stored.visualMap.revisions
      .at(-1)
      .nodes.every(
        (n: { review: { accepted: boolean } }) => !n.review.accepted,
      ),
  ).toBe(true);
});

test("approved diagnosis imports hypotheses honestly; changed diagnosis flags map without overwriting decisions", async ({
  page,
}) => {
  const p = {
    ...structuredClone(exampleProject),
    diagnosis: diagnosisSchema.parse(real),
  };
  p.diagnosis.review!.status = "approved";
  await seed(page, p);
  const map = page.getByRole("region", {
    name: "Editor do mapa de transformação",
  });
  await map
    .getByRole("button", {
      name: "Construir do diagnóstico aprovado",
      exact: true,
    })
    .click();
  await map
    .getByRole("button", { name: "Salvar versão do mapa", exact: true })
    .click();
  const before = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0]
        .visualMap,
  );
  expect(
    before.revisions
      .at(-1)
      .nodes.some((n: { nature: string }) => n.nature === "hypothesis"),
  ).toBe(true);
  // Use the actual diagnosis editor; no provider request.
  await page
    .getByRole("textbox", { name: "Justificativa da proposta", exact: true })
    .fill(
      "Revisão humana adicional: a causa das dificuldades continua a investigar; nenhuma hipótese é fato observado.",
    );
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await expect(
    map.getByText(
      "O diagnóstico ou a descoberta mudou. Seu mapa foi preservado.",
      { exact: true },
    ),
  ).toBeVisible();
  const after = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0]
        .visualMap,
  );
  expect(after).toEqual(before);
  await expect(
    map.getByRole("button", {
      name: "Aprovar mapa e salvar versão",
      exact: true,
    }),
  ).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: originTitle, exact: true }).click();
  await expect(
    map.getByText(
      "O diagnóstico ou a descoberta mudou. Seu mapa foi preservado.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Justificativa da sua revisão", exact: true })
    .fill(
      "Conferi os limites e a nova justificativa, mantendo as hipóteses em investigação no caso fictício.",
    );
  await page
    .getByRole("checkbox", { name: /Revisei as sete dimensões/ })
    .check();
  await page
    .getByRole("button", { name: "Aprovar diagnóstico", exact: true })
    .click();
  await map
    .getByRole("textbox", {
      name: "Como conferi as mudanças na origem",
      exact: true,
    })
    .fill(
      "Conferi a justificativa atualizada e mantenho os elementos para nova revisão explícita, sem substituição automática.",
    );
  await map
    .getByRole("button", {
      name: "Confirmar revisão da origem sem substituir elementos",
      exact: true,
    })
    .click();
  await expect(
    map.getByText(
      "O diagnóstico ou a descoberta mudou. Seu mapa foi preservado.",
      { exact: true },
    ),
  ).toHaveCount(0);
  await map
    .getByRole("button", { name: "Salvar versão do mapa", exact: true })
    .click();
  const rebased = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0]
        .visualMap,
  );
  expect(rebased.revisions).toHaveLength(2);
  expect(
    rebased.revisions.at(-1).nodes.map((n: { title: string }) => n.title),
  ).toEqual(before.revisions[0].nodes.map((n: { title: string }) => n.title));
  expect(
    rebased.revisions
      .at(-1)
      .nodes.every(
        (n: { review: { accepted: boolean } }) => !n.review.accepted,
      ),
  ).toBe(true);
});

test("keyboard movement, removal, connection validation and navigation guards are usable", async ({
  page,
}) => {
  await seed(page, reviewedProject());
  const map = page.getByRole("region", {
    name: "Editor do mapa de transformação",
  });
  await map
    .getByRole("button", { name: "Visão espacial", exact: true })
    .click();
  const handle = map.getByRole("button", {
    name: `Mover ${exampleProject.maps[0].currentState}`,
    exact: true,
  });
  await handle.focus();
  await handle.press("ArrowRight");
  await map
    .getByRole("button", { name: "Salvar versão do mapa", exact: true })
    .click();
  let stored = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0],
  );
  expect(stored.visualMap.revisions.at(-1).nodes[0].x).toBe(50);
  await handle.scrollIntoViewIfNeeded();
  const grip = await handle.boundingBox();
  await page.mouse.move(grip!.x + grip!.width / 2, grip!.y + grip!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    grip!.x + grip!.width / 2 + 30,
    grip!.y + grip!.height / 2 + 15,
    { steps: 4 },
  );
  await page.mouse.up();
  await map
    .getByRole("button", { name: "Salvar versão do mapa", exact: true })
    .click();
  stored = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0],
  );
  expect(stored.visualMap.revisions.at(-1).nodes[0].x).toBe(90);
  expect(stored.visualMap.revisions.at(-1).nodes[0].y).toBe(75);
  await map
    .getByRole("button", { name: "Adicionar elemento", exact: true })
    .click();
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: /Voltar aos projetos/ }).click();
  await expect(map).toBeVisible();
  const inspector = map.getByRole("complementary", {
    name: "Editar elemento do mapa",
  });
  await inspector
    .getByRole("textbox", { name: "Conteúdo do elemento", exact: true })
    .fill("Conceito a remover sem afetar versões anteriores.");
  page.once("dialog", (d) => d.accept());
  await inspector
    .getByRole("button", {
      name: "Remover elemento e suas conexões",
      exact: true,
    })
    .click();
  await map
    .getByRole("button", { name: "Salvar versão do mapa", exact: true })
    .click();
  stored = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0],
  );
  expect(stored.visualMap.revisions).toHaveLength(4);
  expect(
    stored.visualMap.revisions
      .at(-1)
      .nodes.some((n: { title: string }) =>
        n.title.includes("Conceito a remover"),
      ),
  ).toBe(false);
  expect(stored.visualMap.revisions[0].nodes[0].x).toBe(35);
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((e) => e.clientWidth),
  );
});

test("a map edited in another tab cannot be overwritten by a stale editor", async ({
  page,
}) => {
  const p = reviewedProject();
  await seed(page, p);
  const second = await page.context().newPage();
  await second.goto("/");
  await second.getByRole("button", { name: originTitle, exact: true }).click();
  const firstMap = page.getByRole("region", {
      name: "Editor do mapa de transformação",
    }),
    secondMap = second.getByRole("region", {
      name: "Editor do mapa de transformação",
    });
  for (const map of [firstMap, secondMap]) {
    await map
      .getByRole("button", { name: "Lista acessível", exact: true })
      .click();
    await map
      .getByRole("button", { name: /Gestor descreve uma situação/ })
      .click();
  }
  await firstMap
    .getByRole("complementary", { name: "Editar elemento do mapa" })
    .getByRole("textbox", { name: "Conteúdo do elemento", exact: true })
    .fill("Proposta aberta na primeira aba — preservar sem sobrescrever.");
  await secondMap
    .getByRole("complementary", { name: "Editar elemento do mapa" })
    .getByRole("textbox", { name: "Conteúdo do elemento", exact: true })
    .fill("Versão mais recente salva pela segunda aba.");
  await secondMap
    .getByRole("button", { name: "Salvar versão do mapa", exact: true })
    .click();
  await firstMap
    .getByRole("button", { name: "Salvar versão do mapa", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /Os projetos foram alterados em outra aba/ })
      .first(),
  ).toBeVisible();
  await expect(
    firstMap.getByRole("textbox", {
      name: "Conteúdo do elemento",
      exact: true,
    }),
  ).toHaveValue(
    "Proposta aberta na primeira aba — preservar sem sobrescrever.",
  );
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects[0],
  );
  expect(
    saved.visualMap.revisions
      .at(-1)
      .nodes.find((n: { type: string }) => n.type === "desired_state").title,
  ).toBe("Versão mais recente salva pela segunda aba.");
  expect(saved.visualMap.revisions).toHaveLength(2);
  await second.close();
});
