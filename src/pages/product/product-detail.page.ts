import { Locator, Page } from '@playwright/test';
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

  /**
   * Add to cart fires a native `alert()` ("Product added") -- the dialog
   * handler MUST be armed before the click, otherwise the click hangs until
   * timeout waiting on the unhandled dialog. Verified live.
   */
  async addToCart(): Promise<string> {
    return withDialog(this.page, () => this.addToCartLink.click());
  }
}
