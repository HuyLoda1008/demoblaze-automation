import { Dialog, Page } from '@playwright/test';

/**
 * Arms a one-shot native dialog handler, performs `action`, and returns the
 * dialog's message -- regardless of whether the dialog fires synchronously
 * (inside the action's own event handler, e.g. DemoBlaze's empty-field login
 * validation) or asynchronously (after an API round-trip, e.g. wrong-password/
 * nonexistent-user login, which calls `/login` before alerting).
 *
 * MUST use a persistent `page.once('dialog', ...)` listener registered
 * before the action, NOT `page.waitForEvent('dialog')` awaited around the
 * action. Verified live: for dialogs fired synchronously inside a click's
 * event handler (no network round-trip), `locator.click()` blocks on
 * Chromium's own post-click actionability check, which is itself blocked by
 * the open native dialog -- `waitForEvent('dialog')` never gets a chance to
 * resolve in time and the click hangs for the full test timeout. A `page.on`/
 * `page.once` listener avoids that deadlock. But `action()` resolving does
 * NOT guarantee the dialog has already fired for the asynchronous case (the
 * click can resolve well before the API responds and the alert appears), so
 * this waits on a separate promise that the listener resolves whenever it
 * actually fires, decoupled from when `action()` itself settles.
 */
export async function withDialog(
  page: Page,
  action: () => Promise<void>,
  timeoutMs = 10_000
): Promise<string> {
  let resolveMessage: (message: string) => void;
  const dialogCaught = new Promise<string>((resolve) => {
    resolveMessage = resolve;
  });

  page.once('dialog', async (dialog: Dialog) => {
    const message = dialog.message();
    await dialog.accept();
    resolveMessage(message);
  });

  await action();

  return Promise.race([
    dialogCaught,
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms waiting for a dialog`)), timeoutMs)
    ),
  ]);
}
