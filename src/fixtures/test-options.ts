import { test as base } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { ProductDetailPage } from '../pages/product/product-detail.page';
import { CartPage } from '../pages/cart/cart.page';
import { CartCleanup } from './cart-cleanup';
import { DemoblazeApiClient } from '../utils/api-client';
import { getEnvConfig, EnvConfig } from '../../config/environments';

interface Fixtures {
  homePage: HomePage;
  productDetailPage: ProductDetailPage;
  cartPage: CartPage;
  cartCleanup: CartCleanup;
  apiClient: DemoblazeApiClient;
  env: EnvConfig;
}

export const test = base.extend<Fixtures>({
  env: async ({}, use) => {
    await use(getEnvConfig());
  },
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
    // Teardown: leave the shared test account logged out regardless of test
    // outcome, so it never carries a stray authenticated session between
    // runs. Only DemoBlaze's home/cart/product pages share the same nav
    // (#logout2), so this check works no matter which page the test ended
    // on. Best-effort: a page that's already closed/navigated away
    // shouldn't fail the whole test over a logout that no longer matters.
    try {
      if (await homePage.isLoggedIn()) {
        await homePage.logout();
      }
    } catch (err) {
      console.warn('Login teardown: failed to log out at end of test:', err);
    }
  },
  productDetailPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },
  cartPage: async ({ page }, use) => {
    const cartPage = new CartPage(page);
    await use(cartPage);
  },
  // Depends on the `cartPage` fixture (not a fresh CartPage instance) so
  // cleanup runs against the same page/browser context the test used.
  cartCleanup: async ({ cartPage }, use) => {
    const cleanup = new CartCleanup(cartPage);
    await use(cleanup);
    await cleanup.cleanup();
  },
  apiClient: async ({ request, env }, use) => {
    await use(new DemoblazeApiClient(request, env.apiBaseUrl));
  },
});

export { expect } from '@playwright/test';
