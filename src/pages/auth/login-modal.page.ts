import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { withDialog } from '../../utils/dialog-handler';

export class LoginModalPage extends BasePage {
  readonly modal: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.modal = page.locator('#logInModal');
    this.usernameInput = page.locator('#loginusername');
    this.passwordInput = page.locator('#loginpassword');
    this.submitButton = this.modal.getByRole('button', { name: 'Log in' });
  }

  /**
   * Successful login: submit and let the caller await the nav-bar change.
   * Failed login (wrong password / nonexistent user / empty fields): DemoBlaze
   * reports ALL of these via a native `alert()` dialog (e.g. "Wrong password.",
   * "User does not exist.", "Please fill out Username and Password.") -- the
   * `#errorl` label in the DOM is dead markup, verified live to stay empty in
   * every failure case. Use loginExpectingSuccess() / loginExpectingDialog()
   * depending on which outcome the test expects, so the dialog is always
   * armed before the click (an unhandled dialog otherwise hangs the click).
   */
  async loginExpectingSuccess(username: string, password: string): Promise<void> {
    await this.fillCredentials(username, password);
    await this.submitButton.click();
  }

  async loginExpectingDialog(username: string, password: string): Promise<string> {
    await this.fillCredentials(username, password);
    return withDialog(this.page, () => this.submitButton.click());
  }

  /**
   * Fills both fields and re-verifies their values before returning. Under
   * heavy resource contention (e.g. running the full cross-browser project
   * matrix in --headed mode locally, 4+ real browser windows at once) a
   * fill can occasionally not "stick" by the time of the click -- observed
   * live as a login test asserting "Wrong password." but getting "Please
   * fill out Username and Password." back instead, implying the password
   * field was empty at click time despite fill() having been awaited.
   * `expect(...).toHaveValue()` auto-retries, so this both self-heals minor
   * timing issues and fails fast with a clear message if a fill genuinely
   * never takes effect, rather than surfacing as a confusing wrong-dialog
   * assertion several steps later.
   */
  private async fillCredentials(username: string, password: string): Promise<void> {
    await this.usernameInput.waitFor({ state: 'visible' });
    await this.usernameInput.fill(username);
    await expect(this.usernameInput).toHaveValue(username);
    await this.passwordInput.fill(password);
    await expect(this.passwordInput).toHaveValue(password);
  }

  async close(): Promise<void> {
    await this.modal.locator('.close').click();
  }
}
