import { test } from "@playwright/test";
import { LoginPage } from "./pages/loginPage";

test.describe("Auth / Login", () => {
  test("renders login form", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectFormVisible();
  });
});
