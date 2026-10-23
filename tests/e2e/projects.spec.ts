import { test, expect } from "@playwright/test";
test("create, edit, reload, duplicate and delete a project", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Criar meu projeto" }).click();
  await page
    .getByRole("textbox", { name: /Qual conhecimento/ })
    .fill("Feedback para gestores");
  await page
    .getByRole("textbox", { name: /O que o aprendiz/ })
    .fill("Conduzir uma conversa com acordo verificável.");
  await page.getByRole("button", { name: "Salvar descoberta" }).click();
  await expect(
    page.getByRole("heading", { name: "Feedback para gestores", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar descoberta" }).click();
  await page
    .getByRole("textbox", { name: /Quem vai aprender/ })
    .fill("Gestores iniciantes");
  await page.getByRole("button", { name: "Salvar descoberta" }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Feedback para gestores", exact: true })
    .click();
  await expect(
    page.getByText("Gestores iniciantes", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Voltar aos projetos" }).click();
  await page
    .getByRole("button", {
      name: "Duplicar Feedback para gestores",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Feedback para gestores (cópia)",
      exact: true,
    }),
  ).toBeVisible();
  page.on("dialog", (d) => d.accept());
  await page
    .getByRole("button", {
      name: "Excluir Feedback para gestores (cópia)",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Feedback para gestores (cópia)",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((el) => el.clientWidth),
  );
});
test("demonstration has distinct diagnosis, map and deliverables", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explorar projeto demonstrativo" })
    .click();
  for (const name of [
    "Diagnóstico demonstrativo",
    "Mapa de transformação · v1",
    "Plano de aula · Conversas que desenvolvem",
    "Storyboard · Do julgamento ao acordo",
    "Revisão pedagógica editorial",
  ])
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  await page.screenshot({
    path: `test-results/demo-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("unconfigured AI leaves project workflow available and explains the limitation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Criar meu projeto" }).click();
  await page.getByRole("textbox", { name: /Qual conhecimento/ }).fill("Sem IA");
  await page.getByRole("button", { name: "Salvar descoberta" }).click();
  await expect(
    page.getByText(/A IA ainda não está disponível neste ambiente/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Analisar com IA", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: "Sem IA", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sem IA", exact: true }),
  ).toBeVisible();
});

test("conflicting tab saves preserve both the latest stored data and the open unsaved form", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Criar meu projeto" }).click();
  await page
    .getByRole("textbox", { name: /Qual conhecimento/ })
    .fill("Primeiro projeto");
  await page.getByRole("button", { name: "Salvar descoberta" }).click();
  const second = await context.newPage();
  await second.goto("/");
  await second
    .getByRole("button", { name: "Novo projeto", exact: false })
    .click();
  await second
    .getByRole("textbox", { name: /Qual conhecimento/ })
    .fill("Projeto de outra aba");
  await second.getByRole("button", { name: "Salvar descoberta" }).click();
  await page.getByRole("button", { name: "Editar descoberta" }).click();
  await page
    .getByRole("textbox", { name: /Quem vai aprender/ })
    .fill("Minha revisão local");
  await page.getByRole("button", { name: "Salvar descoberta" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "outra aba",
  );
  await expect(
    page.getByRole("textbox", { name: /Quem vai aprender/ }),
  ).toHaveValue("Minha revisão local");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("arquiteto.projects.v1")!).projects
          .length,
    ),
  ).toBe(2);
});
