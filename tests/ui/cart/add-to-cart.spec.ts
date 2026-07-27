import { test, expect } from '../../../src/fixtures/test-options';

const SAMSUNG_S6_ID = 1;

test.describe('Add to cart', () => {
  // DemoBlaze's shared, unpartitioned cart backend (see cart.page.ts) can take
  // up to ~30s to reflect an add under heavy concurrent public traffic --
  // extend beyond the 30s default to leave room for the rest of each test.
  test.describe.configure({ timeout: 60_000 });

  test(
    'adding a product increases the cart by one and shows its name',
    { tag: ['@smoke', '@cart'] },
    async ({ page, productDetailPage, cartPage, cartCleanup }) => {
      await cartPage.open();
      const idsBefore = await cartPage.getRowIdsByName('Samsung galaxy s6');

      await page.goto(`/prod.html?idp_=${SAMSUNG_S6_ID}`);
      const dialogMessage = await productDetailPage.addToCart();
      expect(dialogMessage).toBe('Product added');

      await cartPage.open();
      const [newId] = await cartPage.waitForNewIds('Samsung galaxy s6', idsBefore);
      cartCleanup.track(newId); // no purchase happens in this test -- teardown must delete it explicitly
    }
  );

  test(
    'adding the same product twice appends two separate rows, not a quantity increment',
    { tag: ['@regression', '@cart'] },
    async ({ page, productDetailPage, cartPage, cartCleanup }) => {
      await cartPage.open();
      const idsBefore = await cartPage.getRowIdsByName('Samsung galaxy s6');

      await page.goto(`/prod.html?idp_=${SAMSUNG_S6_ID}`);
      await productDetailPage.addToCart();
      await page.goto(`/prod.html?idp_=${SAMSUNG_S6_ID}`);
      await productDetailPage.addToCart();

      await cartPage.open();
      // DemoBlaze's cart is shared across concurrent real-world visitors AND
      // eventually-consistent (verified live) -- diffing against idsBefore
      // (rather than an absolute/delta count) is what makes this reliable.
      const newIds = await cartPage.waitForNewIds('Samsung galaxy s6', idsBefore, 2);
      cartCleanup.track(...newIds);
    }
  );
});
