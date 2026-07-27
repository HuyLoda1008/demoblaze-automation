import { test, expect } from '../../../src/fixtures/test-options';

const NOKIA_ID = 2;

test.describe('Checkout', () => {
  test(
    'add to cart then place an order completes with a purchase confirmation',
    { tag: ['@smoke', '@cart'] },
    async ({ page, productDetailPage, cartPage }) => {
      // No cartCleanup tracking needed here: a successful purchase calls
      // DemoBlaze's own POST /deletecart as a side effect (verified live via
      // network capture), which clears this browser's cart items itself.
      await page.goto(`/prod.html?idp_=${NOKIA_ID}`);
      await productDetailPage.addToCart();

      await cartPage.open();
      await cartPage.clickPlaceOrder();
      await cartPage.orderModal.fillOrderForm({
        name: 'QA Automation',
        country: 'Vietnam',
        city: 'Ho Chi Minh City',
        card: '4111111111111111',
        month: '12',
        year: '2030',
      });
      await cartPage.orderModal.purchase();

      const confirmation = await cartPage.orderModal.getConfirmation();
      expect(confirmation.name).toBe('QA Automation');
      expect(confirmation.cardNumber).toBe('4111111111111111');
      expect(confirmation.id).not.toBe('');
    }
  );

  test(
    'submitting the order form with all fields empty is a silent no-op (no confirmation, no error)',
    { tag: ['@regression', '@cart'] },
    async ({ page, productDetailPage, cartPage, cartCleanup }) => {
      await cartPage.open();
      const idsBefore = await cartPage.getRowIdsByName('Nokia lumia 1520');

      await page.goto(`/prod.html?idp_=${NOKIA_ID}`);
      await productDetailPage.addToCart();

      await cartPage.open();
      const [newId] = await cartPage.waitForNewIds('Nokia lumia 1520', idsBefore);
      // Purchase is blocked by validation below, so DemoBlaze's own
      // POST /deletecart-on-purchase-success never fires -- this item stays
      // in the shared cart unless we explicitly clean it up.
      cartCleanup.track(newId);

      await cartPage.clickPlaceOrder();
      await cartPage.orderModal.purchase();

      // Verified live: DemoBlaze does not show a confirmation nor any visible
      // error when all order-form fields are left empty -- it silently does
      // nothing. Assert the confirmation never appears rather than expecting
      // a validation message that doesn't exist.
      await expect(cartPage.orderModal.confirmation).not.toBeVisible({ timeout: 3000 });
    }
  );
});
