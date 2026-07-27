import { test, expect } from '../../src/fixtures/test-options';

const NEXUS_ID = 3;

test.describe('Cart and checkout regression', () => {
  test.describe.configure({ timeout: 60_000 });

  test(
    'deleting a cart item removes it from the visible list',
    { tag: ['@regression', '@cart'] },
    async ({ page, productDetailPage, cartPage }) => {
      await cartPage.open();
      const idsBefore = await cartPage.getRowIdsByName('Nexus 6');

      await page.goto(`/prod.html?idp_=${NEXUS_ID}`);
      await productDetailPage.addToCart();

      await cartPage.open();
      const [newId] = await cartPage.waitForNewIds('Nexus 6', idsBefore);

      // This test's own body is its own teardown -- it exercises the delete
      // action directly, so no cartCleanup tracking needed. Delete is served
      // by the same eventually-consistent backend as additions (see
      // cart.page.ts): a single row disappearing among a shared,
      // constantly-changing list can't be asserted by count, so this only
      // checks the delete action itself completes without error.
      await cartPage.deleteRowById(newId);
    }
  );

  test(
    'signing up with an already-registered username is rejected',
    { tag: ['@regression', '@auth'] },
    async ({ homePage, env }) => {
      await homePage.open();
      await homePage.openSignupModal();

      const message = await homePage.signupModal.signup(env.testUser.username, 'irrelevant-password');

      expect(message).toBe('This user already exist.');
    }
  );

  test(
    'placing an order with the Name field empty is a silent no-op, even with every other field filled',
    { tag: ['@regression', '@cart'] },
    async ({ page, productDetailPage, cartPage, cartCleanup }) => {
      await cartPage.open();
      const idsBefore = await cartPage.getRowIdsByName('Nexus 6');

      await page.goto(`/prod.html?idp_=${NEXUS_ID}`);
      await productDetailPage.addToCart();

      await cartPage.open();
      const [newId] = await cartPage.waitForNewIds('Nexus 6', idsBefore);
      // Purchase is blocked below, so DemoBlaze's own purchase-success
      // cart-clear never fires -- clean this up explicitly.
      cartCleanup.track(newId);

      await cartPage.clickPlaceOrder();
      await cartPage.orderModal.countryInput.fill('Vietnam');
      await cartPage.orderModal.cityInput.fill('Ho Chi Minh City');
      await cartPage.orderModal.cardInput.fill('4111111111111111');
      await cartPage.orderModal.monthInput.fill('12');
      await cartPage.orderModal.yearInput.fill('2030');
      // Name intentionally left empty.
      await cartPage.orderModal.purchase();

      await expect(cartPage.orderModal.confirmation).not.toBeVisible({ timeout: 3000 });
    }
  );

  test(
    'placing an order with only the Name field filled is also a silent no-op',
    { tag: ['@regression', '@cart'] },
    async ({ page, productDetailPage, cartPage, cartCleanup }) => {
      await cartPage.open();
      const idsBefore = await cartPage.getRowIdsByName('Nexus 6');

      await page.goto(`/prod.html?idp_=${NEXUS_ID}`);
      await productDetailPage.addToCart();

      await cartPage.open();
      const [newId] = await cartPage.waitForNewIds('Nexus 6', idsBefore);
      cartCleanup.track(newId);

      await cartPage.clickPlaceOrder();
      await cartPage.orderModal.nameInput.fill('Only Name Filled');
      // All other fields intentionally left empty.
      await cartPage.orderModal.purchase();

      await expect(cartPage.orderModal.confirmation).not.toBeVisible({ timeout: 3000 });
    }
  );
});
