import { Locator, Page } from '@playwright/test';
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

  async open(): Promise<void> {
    await this.goto('/');
  }

  async openLoginModal(): Promise<void> {
    await this.loginNavLink.click();
    await this.loginModal.modal.waitFor({ state: 'visible' });
  }

  async openSignupModal(): Promise<void> {
    await this.signupNavLink.click();
    await this.signupModal.modal.waitFor({ state: 'visible' });
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

  async openProductByName(name: string): Promise<void> {
    await this.page.locator('.card-title a.hrefch', { hasText: name }).click();
  }
}
