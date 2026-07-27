import { test, expect } from '../../../src/fixtures/test-options';

test.describe('Login', () => {
  test('valid credentials log the user in', { tag: ['@smoke', '@auth'] }, async ({ homePage, env }) => {
    await homePage.open();
    await homePage.openLoginModal();

    await homePage.loginModal.loginExpectingSuccess(env.testUser.username, env.testUser.password);

    // Generous timeout: this framework uses a single fixed shared test
    // account (DemoBlaze has no account-provisioning API -- see README), so
    // when the full cross-browser project matrix runs in parallel, multiple
    // browsers can be authenticating as the same account simultaneously.
    // Verified live: this reliably passes in isolation/serial execution but
    // occasionally needs more than the 5s default under that concurrent
    // contention. A longer timeout, not full serialization, keeps CI fast.
    await expect(homePage.welcomeLabel).toHaveText(`Welcome ${env.testUser.username}`, { timeout: 15_000 });
    await expect(homePage.logoutNavLink).toBeVisible();
  });

  test('wrong password is rejected via a native alert', { tag: ['@regression', '@auth'] }, async ({ homePage, env }) => {
    await homePage.open();
    await homePage.openLoginModal();

    const message = await homePage.loginModal.loginExpectingDialog(env.testUser.username, 'definitely-wrong-password');

    expect(message).toBe('Wrong password.');
    expect(await homePage.isLoggedIn()).toBe(false);
  });

  test('nonexistent username is rejected via a native alert', { tag: ['@regression', '@auth'] }, async ({ homePage }) => {
    await homePage.open();
    await homePage.openLoginModal();

    const message = await homePage.loginModal.loginExpectingDialog('nonexistent_user_zzz_999', 'whatever123');

    expect(message).toBe('User does not exist.');
  });

  test('empty username and password is rejected via a native alert', { tag: ['@regression', '@auth'] }, async ({ homePage }) => {
    await homePage.open();
    await homePage.openLoginModal();

    const message = await homePage.loginModal.loginExpectingDialog('', '');

    expect(message).toBe('Please fill out Username and Password.');
  });
});
