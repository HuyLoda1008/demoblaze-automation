import { Locator, Page } from '@playwright/test';
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

  /** Signup result (success "Sign up successful." or failure "This user already exist.")
   * is always reported via a native alert() dialog -- verified live, same pattern as login.
   * The `#errors` label in the DOM is dead markup and never populates. */
  async signup(username: string, password: string): Promise<string> {
    await this.usernameInput.waitFor({ state: 'visible' });
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    return withDialog(this.page, () => this.submitButton.click());
  }
}
