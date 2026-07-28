import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { LoginModalPage } from './auth/login-modal.page';
import { SignupModalPage } from './auth/signup-modal.page';

export class HomePage extends BasePage {
  readonly loginNavLink: Locator;
  readonly signupNavLink: Locator;
  readonly logoutNavLink: Locator;
  readonly welcomeLabel: Locator;
  readonly cartNavLink: Locator;
  readonly productCards: Locator;

  readonly loginModal: LoginModalPage;
  readonly signupModal: SignupModalPage;

  constructor(page: Page) {
    super(page);
    this.loginNavLink = page.locator('#login2');
    this.signupNavLink = page.locator('#signin2');
    this.logoutNavLink = page.locator('#logout2');
    this.welcomeLabel = page.locator('#nameofuser');
    this.cartNavLink = page.locator('#cartur');
    this.productCards = page.locator('.card');

    this.loginModal = new LoginModalPage(page);
    this.signupModal = new SignupModalPage(page);
  }

  /** Verifies the product grid actually rendered before returning -- a slow
   * or broken page load would otherwise surface as a confusing failure
   * several steps later (e.g. openLoginModal() clicking a nav link that
   * technically exists but the page around it never finished loading). */
  async open(): Promise<void> {
    await this.goto('/');
    await expect(this.productCards.first()).toBeVisible();
  }

  async isLoaded(timeoutMs = 10_000): Promise<boolean> {
    try {
      await this.productCards.first().waitFor({ state: 'visible', timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  }

  async openLoginModal(): Promise<void> {
    await this.loginNavLink.click();
    await expect(this.loginModal.modal).toBeVisible();
    await expect(this.loginModal.usernameInput).toBeVisible();
  }

  async openSignupModal(): Promise<void> {
    await this.signupNavLink.click();
    await expect(this.signupModal.modal).toBeVisible();
    await expect(this.signupModal.usernameInput).toBeVisible();
  }

  async isLoggedIn(): Promise<boolean> {
    const visible = await this.logoutNavLink.isVisible();
    if (!visible) return false;
    const text = await this.welcomeLabel.innerText();
    return text.startsWith('Welcome');
  }

  /** Short default timeout (see CartPage.deleteRowById for the same
   * reasoning): this is called from fixture teardown, so a stuck click
   * shouldn't be allowed to burn through the rest of the test's timeout
   * budget just to log out a shared account nobody's blocking on. */
  async logout(timeoutMs = 5_000): Promise<void> {
    await this.logoutNavLink.click({ timeout: timeoutMs });
  }

  async getProductNames(): Promise<string[]> {
    return this.page.locator('.card-title a.hrefch').allInnerTexts();
  }
}
