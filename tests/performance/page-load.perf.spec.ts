import { test, expect } from '../../src/fixtures/test-options';
import { getNavigationTiming } from '../../src/utils/perf-utils';

/**
 * Scoped-down, honest interpretation of the "performance" test type: a
 * navigation-timing smoke assertion, not a k6/Lighthouse pipeline. DemoBlaze
 * is an uncontrolled public demo site with no SLA (and, per the cart specs,
 * demonstrably under heavy shared load from other visitors), so absolute
 * timing numbers aren't meaningful to compare run-over-run -- this exists to
 * demonstrate the pattern (wire perf assertions into the same framework/
 * reporting pipeline) with a generous, non-flaky budget, not to certify
 * DemoBlaze's actual performance.
 */
test.describe('Performance', () => {
  test('home page finishes loading within a generous budget', { tag: ['@perf'] }, async ({ page }) => {
    await page.goto('/');

    const timing = await getNavigationTiming(page);
    console.log('Home page navigation timing:', timing);

    expect(timing.domContentLoadedMs).toBeGreaterThan(0);
    expect(timing.loadEventMs).toBeLessThan(15_000);
  });

  test('product detail page finishes loading within a generous budget', { tag: ['@perf'] }, async ({ page }) => {
    await page.goto('/prod.html?idp_=1');

    const timing = await getNavigationTiming(page);
    console.log('Product detail page navigation timing:', timing);

    expect(timing.domContentLoadedMs).toBeGreaterThan(0);
    expect(timing.loadEventMs).toBeLessThan(15_000);
  });
});
