import { test, expect } from "@playwright/test";

test.describe("Fluxo crítico - smoke", function () {
  test("rota de sucesso de checkout responde sem orderId", async function ({ page }) {
    await page.goto("/checkout/success");

    await expect(
      page.getByRole("heading", { name: /Pedido Confirmado!/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Ver Meus Pedidos/i })
    ).toBeVisible();
  });

  test("links legais estão publicados e acessíveis", async function ({ page }) {
    await page.goto("/");

    await page.getByRole("link", { name: /Política de Privacidade/i }).click();
    await expect(page).toHaveURL(/\/politica-de-privacidade/);
    await expect(
      page.getByRole("heading", { name: /Política de Privacidade/i })
    ).toBeVisible();

    await page.goto("/");
    await page.getByRole("link", { name: /Termos de Uso/i }).click();
    await expect(page).toHaveURL(/\/termos-de-uso/);
    await expect(
      page.getByRole("heading", { name: /Termos de Uso/i })
    ).toBeVisible();
  });
});

