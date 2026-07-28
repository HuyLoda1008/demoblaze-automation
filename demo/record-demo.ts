/**
 * Records a single continuous video of the "Automation Implementation Demo"
 * flow the challenge brief asks for: log in with valid credentials, add a
 * product to cart, then place an order. Not a test (no pass/fail
 * assertions) -- reuses the same page objects the actual test suite uses,
 * paced with short waits so a human watching can follow each step, unlike
 * a real test run which moves at whatever speed the site responds.
 *
 * Run: npx tsx demo/record-demo.ts
 * Output: demo/login-cart-checkout-demo.webm
 *
 * Note: Playwright's bundled ffmpeg (used internally for video encoding)
 * is a stripped-down build with only the webm muxer enabled -- verified
 * live, attempting to convert to .mp4 with it fails with "Unable to choose
 * an output format". webm plays natively in every modern browser and
 * uploads directly to YouTube/Loom, so there's no real need to convert.
 */
import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { HomePage } from '../src/pages/home.page';
import { ProductDetailPage } from '../src/pages/product/product-detail.page';
import { CartPage } from '../src/pages/cart/cart.page';
import { getEnvConfig } from '../config/environments';

const OUTPUT_DIR = path.join(__dirname, 'output');
const FINAL_PATH = path.join(__dirname, 'login-cart-checkout-demo.webm');
const PRODUCT_ID = 6; // "Sony xperia z5" -- confirmed via GET /view before recording

async function pause(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const env = getEnvConfig();
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const context = await browser.newContext({
    baseURL: env.baseUrl,
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();

  const homePage = new HomePage(page);
  const productDetailPage = new ProductDetailPage(page);
  const cartPage = new CartPage(page);

  // 1. Log in with valid credentials
  await homePage.open();
  await pause(2000);
  await homePage.openLoginModal();
  await pause(1200);
  await homePage.loginModal.loginExpectingSuccess(env.testUser.username, env.testUser.password);
  await pause(2500);

  // 2. Add a product to cart
  await page.goto(`/prod.html?idp_=${PRODUCT_ID}`);
  await pause(2000);
  await productDetailPage.addToCart();
  await pause(2500);

  // 3. Place an order
  await cartPage.open();
  await pause(2500);
  await cartPage.clickPlaceOrder();
  await pause(1000);
  await cartPage.orderModal.fillOrderForm({
    name: 'QA Automation Demo',
    country: 'Vietnam',
    city: 'Ho Chi Minh City',
    card: '4111111111111111',
    month: '12',
    year: '2030',
  });
  await pause(2000);
  await cartPage.orderModal.purchase();
  await pause(4000); // hold on the confirmation dialog so it's readable in the recording

  await context.close();
  await browser.close();

  const [rawVideo] = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.webm'));
  fs.renameSync(path.join(OUTPUT_DIR, rawVideo), FINAL_PATH);
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  console.log(`Wrote ${FINAL_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
