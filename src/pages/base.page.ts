import { Page } from '@playwright/test';

/**
 * Thin shared base. Playwright's own locators + expect() already auto-wait
 * and retry, so this stays minimal -- unlike a pytest-based framework there's
 * no need to hand-roll polling helpers for simple visibility/fill/click.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
  }
}
