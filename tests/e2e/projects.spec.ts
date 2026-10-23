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
