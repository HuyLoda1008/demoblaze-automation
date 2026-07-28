import { test, expect } from '../../../src/fixtures/test-options';

test.describe('Login', () => {
  test('valid credentials log the user in', { tag: ['@smoke', '@auth'] }, async ({ homePage, env }) => {
    await homePage.open();
    expect(await homePage.isLoaded()).toBe(true);

    await homePage.openLoginModal();
    expect(await homePage.loginModal.isLoaded()).toBe(true);

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

  test(
    'wrong password is rejected via a native alert',
    { tag: ['@regression', '@auth'] },
    async ({ homePage, env }) => {
      await homePage.open();
      expect(await homePage.isLoaded()).toBe(true);

      await homePage.openLoginModal();
      expect(await homePage.loginModal.isLoaded()).toBe(true);

      const message = await homePage.loginModal.loginExpectingDialog(
        env.testUser.username,
        'definitely-wrong-password'
      );

      expect(message).toBe('Wrong password.');
      expect(await homePage.isLoggedIn()).toBe(false);
    }
  );

  test(
    'nonexistent username is rejected via a native alert',
    { tag: ['@regression', '@auth'] },
    async ({ homePage }) => {
      await homePage.open();
      expect(await homePage.isLoaded()).toBe(true);

      await homePage.openLoginModal();
      expect(await homePage.loginModal.isLoaded()).toBe(true);

      const message = await homePage.loginModal.loginExpectingDialog(
        'nonexistent_user_zzz_999',
        'whatever123'
      );

      expect(message).toBe('User does not exist.');
    }
  );

  test(
    'empty username and password is rejected via a native alert',
    { tag: ['@regression', '@auth'] },
    async ({ homePage }) => {
      await homePage.open();
      expect(await homePage.isLoaded()).toBe(true);

      await homePage.openLoginModal();
      expect(await homePage.loginModal.isLoaded()).toBe(true);

      const message = await homePage.loginModal.loginExpectingDialog('', '');

      expect(message).toBe('Please fill out Username and Password.');
    }
  );

  test(
    'a username padded with whitespace is treated as a different, nonexistent username',
    { tag: ['@regression', '@auth'] },
    async ({ homePage, env }) => {
      await homePage.open();
      expect(await homePage.isLoaded()).toBe(true);

      await homePage.openLoginModal();
      expect(await homePage.loginModal.isLoaded()).toBe(true);

      // Verified live: DemoBlaze does not trim the username server-side, so
      // padding a real, registered username with spaces makes it fail the
      // same way an unregistered one would.
      const message = await homePage.loginModal.loginExpectingDialog(
        `  ${env.testUser.username}  `,
        env.testUser.password
      );

      expect(message).toBe('User does not exist.');
    }
  );

  test(
    'log out returns the nav bar to the logged-out state',
    { tag: ['@regression', '@auth'] },
    async ({ homePage, env }) => {
      await homePage.open();
      expect(await homePage.isLoaded()).toBe(true);

      await homePage.openLoginModal();
      expect(await homePage.loginModal.isLoaded()).toBe(true);
      await homePage.loginModal.loginExpectingSuccess(env.testUser.username, env.testUser.password);
      await expect(homePage.welcomeLabel).toHaveText(`Welcome ${env.testUser.username}`, { timeout: 15_000 });

      await homePage.logout();

      await expect(homePage.logoutNavLink).not.toBeVisible();
      await expect(homePage.loginNavLink).toBeVisible();
    }
  );
});
