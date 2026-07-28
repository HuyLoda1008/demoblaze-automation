import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { OrderModalPage } from '../checkout/order-modal.page';

export interface CartRow {
  id: string;
  name: string;
}

export class CartPage extends BasePage {
  readonly rows: Locator;
  /**
   * Scoped/role-based on purpose: a bare `text=Place Order` locator
   * ambiguously substring-matches the order modal's own heading "Place
   * order" (Playwright's text engine is case-insensitive), which caused a
   * strict-mode violation / timeout when verified live. Always use the
   * button role here, never a bare text locator.
   */
  readonly placeOrderButton: Locator;
  readonly orderModal: OrderModalPage;

  constructor(page: Page) {
    super(page);
    this.rows = page.locator('#tbodyid tr');
    this.placeOrderButton = page.getByRole('button', { name: 'Place Order' });
    this.orderModal = new OrderModalPage(page);
  }

  /** `placeOrderButton` is part of the page's static layout, not the
   * dynamically-rendered row list -- confirmed live it's present and
   * visible even when the cart has zero rows, so it's a reliable "the cart
   * page itself finished loading" marker regardless of cart content. */
  async open(): Promise<void> {
    await this.goto('/cart.html');
    await expect(this.placeOrderButton).toBeVisible();
    // DemoBlaze populates the cart *rows* asynchronously after that, on a
    // separate timer from the rest of the page -- give it a moment before
    // any caller starts reading row state, on top of the load assertion
    // above.
    await this.page.waitForTimeout(500);
  }

  async isLoaded(timeoutMs = 10_000): Promise<boolean> {
    try {
      await this.placeOrderButton.waitFor({ state: 'visible', timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  }

  async getRowCount(): Promise<number> {
    return this.rows.count();
  }

  /**
   * Parses each row's cart-item id from its "Delete" link's
   * `onclick="deleteItem('<id>')"` attribute alongside the product name --
   * confirmed live: `<tr><td><img></td><td>{title}</td><td>{price}</td>
   * <td><a onclick="deleteItem('<id>')">Delete</a></td></tr>`. The id is
   * what makes precise teardown possible (see deleteRowById / waitForNewIds)
   * instead of only being able to delete "the first row matching this name",
   * which risks deleting another visitor's identically-named row given the
   * cart is shared (see the class-level quirks doc below).
   */
  async getRows(): Promise<CartRow[]> {
    return this.rows.evaluateAll((trs) =>
      trs.map((tr) => {
        const name = tr.children[1]?.textContent?.trim() ?? '';
        const deleteLink = tr.querySelector('a[onclick^="deleteItem"]');
        const match = deleteLink?.getAttribute('onclick')?.match(/deleteItem\('([^']+)'\)/);
        return { id: match?.[1] ?? '', name };
      })
    );
  }

  async getRowNames(): Promise<string[]> {
    return (await this.getRows()).map((r) => r.name);
  }

  async getRowIdsByName(productName: string): Promise<string[]> {
    return (await this.getRows()).filter((r) => r.name === productName).map((r) => r.id);
  }

  /**
   * DemoBlaze's cart is NOT session-isolated -- verified live that the row
   * count swings wildly in BOTH directions while a test is running (observed
   * 0 -> 274 growth in one run, and 293 -> 49 shrinkage in another),
   * consistent with a shared, unpartitioned backend under real concurrent
   * traffic from this public practice site's other visitors, not just this
   * test run. An earlier version of this framework captured a "baseline" row
   * count before adding and asserted `count >= baseline + N` afterward --
   * verified live that this is unsafe even with polling: a baseline captured
   * at a high-traffic peak can look like it *shrank* by the time of the
   * check, even though the product under test was successfully added and is
   * still present. The fix went further than presence-only checking: it also
   * diffs cart-item *ids* against a before-snapshot, so callers get back the
   * precise id(s) that were newly added -- both a more reliable assertion
   * (immune to unrelated rows appearing/disappearing) and what teardown
   * needs to delete exactly what this test added, not a same-named row that
   * happens to belong to another concurrent visitor.
   *
   * Also handles eventual consistency in `/addtocart`: the confirmation
   * dialog ("Product added") can fire before the item is actually queryable
   * via `/viewcart` moments later, so this polls the already-loaded page's
   * DOM repeatedly. Note: an earlier version of this helper called
   * `page.reload()` on every poll cycle instead of just once up front, which
   * re-triggers the `/viewcart` fetch from scratch each time -- under real
   * load that in-flight fetch can take longer than one poll interval, so
   * reloading every cycle cancelled it before it ever resolved, livelocking
   * at 0 rows forever regardless of timeout. Reloading once is enough to
   * (re)trigger the fetch; after that, just wait for the DOM to update.
   */
  async waitForNewIds(
    productName: string,
    idsBefore: string[],
    minNew = 1,
    timeoutMs = 30_000
  ): Promise<string[]> {
    await this.page.reload();
    const before = new Set(idsBefore);
    const deadline = Date.now() + timeoutMs;
    let newIds: string[] = [];
    while (newIds.length < minNew && Date.now() < deadline) {
      const rows = await this.getRows();
      newIds = rows.filter((r) => r.name === productName && !before.has(r.id)).map((r) => r.id);
      if (newIds.length < minNew) {
        await this.page.waitForTimeout(1_000);
      }
    }
    expect(newIds.length).toBeGreaterThanOrEqual(minNew);
    return newIds;
  }

  /**
   * `timeoutMs` defaults short (not Playwright's own 30s+ default) because
   * this is the method cart teardown calls per tracked id: if a row is
   * already gone by teardown time -- plausible given how volatile this
   * shared cart is, e.g. another visitor's concurrent purchase clearing
   * cart state, or the row simply aging out -- a single missing id
   * shouldn't be allowed to burn through the rest of the test's timeout
   * budget waiting on a locator that will never appear. Verified live: an
   * earlier version without this timeout caused "Tearing down cartCleanup
   * exceeded the test timeout" failures instead of a clean, caught,
   * best-effort warning.
   */
  async deleteRowById(id: string, timeoutMs = 5_000): Promise<void> {
    await this.page.locator(`a[onclick="deleteItem('${id}')"]`).click({ timeout: timeoutMs });
    // Row removal is a client-side DOM splice with no navigation to await.
    await this.page.waitForTimeout(500);
  }

  /** Name-based delete, kept for the regression test that specifically
   * exercises the delete UX itself. Prefer deleteRowById for teardown, where
   * precision (not deleting another visitor's same-named row) matters. */
  async deleteRowByName(productName: string): Promise<void> {
    const row = this.page
      .locator('#tbodyid tr', { has: this.page.locator(`td:has-text("${productName}")`) })
      .first();
    await row.locator('a', { hasText: 'Delete' }).click();
    await this.page.waitForTimeout(500);
  }

  async clickPlaceOrder(): Promise<void> {
    await this.placeOrderButton.click();
    await expect(this.orderModal.modal).toBeVisible();
    await expect(this.orderModal.nameInput).toBeVisible();
  }
}
