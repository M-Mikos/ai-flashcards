import { test } from "@playwright/test";
import { FlashcardsPage } from "./pages/flashcardsPage";
import { LoginPage } from "./pages/loginPage";

test.describe("Flashcards / Create", () => {
  test("user can create a flashcard", async ({ page }) => {
    const email = process.env.E2E_USERNAME ?? "user@example.com";
    const password = process.env.E2E_PASSWORD ?? "password123";

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectFormVisible();
    await loginPage.emailInput.fill(email);
    await loginPage.passwordInput.fill(password);
    await loginPage.submitButton.click();

    const flashcardsPage = new FlashcardsPage(page);
    await flashcardsPage.goto();

    const front = `E2E front ${Date.now()}`;
    const back = "E2E back content";

    await flashcardsPage.createFlashcard(front, back);
    await flashcardsPage.expectFlashcardVisible(front);
  });
});
