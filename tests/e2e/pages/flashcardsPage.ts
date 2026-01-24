import { expect, type Locator, type Page } from "@playwright/test";

class AddFlashcardDialog {
  private readonly page: Page;
  readonly root: Locator;
  readonly frontInput: Locator;
  readonly backInput: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId("add-flashcard-dialog");
    this.frontInput = page.getByTestId("flashcard-front-input");
    this.backInput = page.getByTestId("flashcard-back-input");
    this.saveButton = page.getByTestId("save-flashcard-button");
  }

  async expectOpen() {
    await expect(this.root).toBeVisible();
  }

  async fillForm({ front, back }: { front: string; back: string }) {
    await this.frontInput.fill(front);
    await this.backInput.fill(back);
  }

  async submitAndWaitForClose() {
    await this.saveButton.click();
    await expect(this.root).toBeHidden();
  }
}

export class FlashcardsPage {
  readonly page: Page;
  readonly openAddButton: Locator;
  readonly flashcardCards: Locator;
  readonly dialog: AddFlashcardDialog;

  constructor(page: Page) {
    this.page = page;
    this.openAddButton = page.getByTestId("open-add-dialog-button");
    this.flashcardCards = page.getByTestId("flashcard-card");
    this.dialog = new AddFlashcardDialog(page);
  }

  async goto() {
    await this.page.goto("/");
  }

  async openCreateDialog() {
    await this.openAddButton.click();
    await this.dialog.expectOpen();
  }

  async createFlashcard(front: string, back: string) {
    await this.openCreateDialog();
    await this.dialog.fillForm({ front, back });
    await this.dialog.submitAndWaitForClose();
  }

  async expectFlashcardsPageVisible() {
    await expect(this.openAddButton).toBeVisible();
  }

  getCardByFront(frontText: string) {
    return this.flashcardCards.filter({
      has: this.page.getByTestId("flashcard-front").filter({ hasText: frontText }),
    });
  }

  async expectFlashcardVisible(frontText: string) {
    const card = this.getCardByFront(frontText);
    await expect(card).toBeVisible();
  }
}
