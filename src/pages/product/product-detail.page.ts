import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { withDialog } from '../../utils/dialog-handler';

export class ProductDetailPage extends BasePage {
  readonly addToCartLink: Locator;
  readonly productTitle: Locator;
  readonly productPrice: Locator;

  constructor(page: Page) {
    super(page);
    this.addToCartLink = page.getByRole('link', { name: 'Add to cart' });
    this.productTitle = page.locator('.product-content h2.name');
    this.productPrice = page.locator('.product-content h3.price-container');
  }

  /** Navigates directly by id (there's no reliable link-based nav from every
   * calling context) and verifies the product actually rendered before
   * returning -- a bad id or a slow-loading page would otherwise surface as
   * a confusing failure several steps later, e.g. inside addToCart(). */
  async open(productId: number | string): Promise<void> {
    await this.goto(`/prod.html?idp_=${productId}`);
    await expect(this.productTitle).toBeVisible();
    await expect(this.addToCartLink).toBeVisible();
  }

  async isLoaded(timeoutMs = 10_000): Promise<boolean> {
    try {
      await this.productTitle.waitFor({ state: 'visible', timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  }

  async getProductTitle(): Promise<string> {
    return (await this.productTitle.innerText()).trim();
  }

  /**
   * Add to cart fires a native `alert()` ("Product added") -- the dialog
   * handler MUST be armed before the click, otherwise the click hangs until
   * timeout waiting on the unhandled dialog. Verified live.
   */
  async addToCart(): Promise<string> {
    return withDialog(this.page, () => this.addToCartLink.click());
  }
}
