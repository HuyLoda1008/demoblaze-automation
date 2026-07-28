import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { withDialog } from '../../utils/dialog-handler';

export class SignupModalPage extends BasePage {
  readonly modal: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.modal = page.locator('#signInModal');
    this.usernameInput = page.locator('#sign-username');
    this.passwordInput = page.locator('#sign-password');
    this.submitButton = this.modal.getByRole('button', { name: 'Sign up' });
  }

  async isLoaded(timeoutMs = 10_000): Promise<boolean> {
    try {
      await this.modal.waitFor({ state: 'visible', timeout: timeoutMs });
      await this.submitButton.waitFor({ state: 'visible', timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  }

  /** Signup result (success "Sign up successful." or failure "This user already exist.")
   * is always reported via a native alert() dialog -- verified live, same pattern as login.
   * The `#errors` label in the DOM is dead markup and never populates. Same fill-then-verify
   * pattern as LoginModalPage's fillCredentials -- see that comment for why (contention under
   * a full headed parallel run can occasionally make a fill not "stick" before the click). */
  async signup(username: string, password: string): Promise<string> {
    await this.usernameInput.waitFor({ state: 'visible' });
    await this.usernameInput.fill(username);
    await expect(this.usernameInput).toHaveValue(username);
    await this.passwordInput.fill(password);
    await expect(this.passwordInput).toHaveValue(password);
    return withDialog(this.page, () => this.submitButton.click());
  }
}
