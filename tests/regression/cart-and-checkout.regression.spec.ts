import { test, expect } from '../../src/fixtures/test-options';

const NEXUS_ID = 3;

test.describe('Cart and checkout regression', () => {
  test.describe.configure({ timeout: 60_000 });

  test(
    'deleting a cart item removes it from the visible list',
    { tag: ['@regression', '@cart'] },
    async ({ productDetailPage, cartPage }) => {
      await cartPage.open();
      expect(await cartPage.isLoaded()).toBe(true);
      const idsBefore = await cartPage.getRowIdsByName('Nexus 6');

      await productDetailPage.open(NEXUS_ID);
      expect(await productDetailPage.isLoaded()).toBe(true);
      const dialogMessage = await productDetailPage.addToCart();
      expect(dialogMessage).toBe('Product added');

      await cartPage.open();
      expect(await cartPage.isLoaded()).toBe(true);
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
      expect(await homePage.isLoaded()).toBe(true);

      await homePage.openSignupModal();
      expect(await homePage.signupModal.isLoaded()).toBe(true);

      const message = await homePage.signupModal.signup(env.testUser.username, 'irrelevant-password');

      expect(message).toBe('This user already exist.');
    }
  );

  test(
    'placing an order with the Name field empty is a silent no-op, even with every other field filled',
    { tag: ['@regression', '@cart'] },
    async ({ productDetailPage, cartPage, cartCleanup }) => {
      await cartPage.open();
      expect(await cartPage.isLoaded()).toBe(true);
      const idsBefore = await cartPage.getRowIdsByName('Nexus 6');

      await productDetailPage.open(NEXUS_ID);
      expect(await productDetailPage.isLoaded()).toBe(true);
      const dialogMessage = await productDetailPage.addToCart();
      expect(dialogMessage).toBe('Product added');

      await cartPage.open();
      expect(await cartPage.isLoaded()).toBe(true);
      const [newId] = await cartPage.waitForNewIds('Nexus 6', idsBefore);
      // Purchase is blocked below, so DemoBlaze's own purchase-success
      // cart-clear never fires -- clean this up explicitly.
      cartCleanup.track(newId);

      await cartPage.clickPlaceOrder();
      expect(await cartPage.orderModal.isLoaded()).toBe(true);

      const { orderModal } = cartPage;
      await orderModal.countryInput.fill('Vietnam');
      await expect(orderModal.countryInput).toHaveValue('Vietnam');
      await orderModal.cityInput.fill('Ho Chi Minh City');
      await expect(orderModal.cityInput).toHaveValue('Ho Chi Minh City');
      await orderModal.cardInput.fill('4111111111111111');
      await expect(orderModal.cardInput).toHaveValue('4111111111111111');
      await orderModal.monthInput.fill('12');
      await expect(orderModal.monthInput).toHaveValue('12');
      await orderModal.yearInput.fill('2030');
      await expect(orderModal.yearInput).toHaveValue('2030');
      // Name intentionally left empty.
      await orderModal.purchase();

      await expect(orderModal.confirmation).not.toBeVisible({ timeout: 3000 });
    }
  );

  test(
    'placing an order with only the Name field filled is also a silent no-op',
    { tag: ['@regression', '@cart'] },
    async ({ productDetailPage, cartPage, cartCleanup }) => {
      await cartPage.open();
      expect(await cartPage.isLoaded()).toBe(true);
      const idsBefore = await cartPage.getRowIdsByName('Nexus 6');

      await productDetailPage.open(NEXUS_ID);
      expect(await productDetailPage.isLoaded()).toBe(true);
      const dialogMessage = await productDetailPage.addToCart();
      expect(dialogMessage).toBe('Product added');

      await cartPage.open();
      expect(await cartPage.isLoaded()).toBe(true);
      const [newId] = await cartPage.waitForNewIds('Nexus 6', idsBefore);
      cartCleanup.track(newId);

      await cartPage.clickPlaceOrder();
      expect(await cartPage.orderModal.isLoaded()).toBe(true);

      const { orderModal } = cartPage;
      await orderModal.nameInput.fill('Only Name Filled');
      await expect(orderModal.nameInput).toHaveValue('Only Name Filled');
      // All other fields intentionally left empty.
      await orderModal.purchase();

      await expect(orderModal.confirmation).not.toBeVisible({ timeout: 3000 });
    }
  );
});
