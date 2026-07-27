import { CartPage } from '../pages/cart/cart.page';

/**
 * Teardown collector for cart items: a test appends whatever cart-item ids
 * it created, and teardown deletes them after the test body runs --
 * including when the test failed, since the fixture cleanup in
 * `test-options.ts` runs unconditionally after `use()`.
 *
 * NOT needed for tests that complete a real purchase: DemoBlaze's own
 * `purchaseOrder()` calls `POST /deletecart` on success, which clears this
 * browser's cart itself as a side effect (verified live) -- tracking ids
 * that were just auto-deleted would only produce harmless no-op delete
 * clicks, but it's simpler and clearer to just not track them in the first
 * place. Only track ids from adds that are NOT followed by a successful
 * purchase (plain add-to-cart tests, and negative checkout tests where
 * purchase is blocked by validation).
 */
export class CartCleanup {
  private readonly ids: string[] = [];

  constructor(private readonly cartPage: CartPage) {}

  track(...ids: string[]): void {
    this.ids.push(...ids);
  }

  async cleanup(): Promise<void> {
    if (this.ids.length === 0) return;

    // Negative checkout tests (e.g. "purchase blocked by empty Name field")
    // leave the order modal open -- purchase() never succeeds, so nothing
    // ever dismisses it. Verified live: without navigating back to a clean
    // cart page first, the still-open #orderModal intercepts pointer events
    // on the row underneath, and every delete click below fails (caught,
    // logged, but silently a no-op) instead of actually cleaning up.
    await this.cartPage.open();

    for (const id of this.ids) {
      try {
        await this.cartPage.deleteRowById(id);
      } catch (err) {
        // Best-effort: one failed deletion (e.g. the row was already gone --
        // plausible given how volatile this shared cart is, see cart.page.ts)
        // shouldn't fail the test or block cleaning up the rest.
        console.warn(`Cart teardown: failed to delete cart item ${id}:`, err);
      }
    }
  }
}
