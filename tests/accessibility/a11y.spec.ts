import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../src/fixtures/test-options';

const NOKIA_ID = 2;

/**
 * DemoBlaze is a third-party public site with real, pre-existing
 * accessibility violations -- confirmed live with axe-core before writing
 * these assertions, not assumed. An initial version of this file asserted
 * an EXACT violation-id list per page, but re-running it live (3x in a
 * row, same page, same browser) showed `link-name` flipping in and out on
 * the Home page -- the page has dynamic content (rotating catalog/ad
 * elements) that isn't fully deterministic run to run. An exact-match
 * assertion against a page like that just flips pass/fail on content this
 * suite doesn't control, not on anything actually regressing.
 *
 * So instead: every violation id found must be a MEMBER of this known
 * allowlist (a superset across all three pages, not per-page) -- new
 * violation TYPES beyond what's already been seen still fail the test,
 * but which of the already-known ones show up on a given run doesn't.
 * `image-alt` (critical) is asserted as always-present on every page since
 * it was the one violation confirmed present on every single run.
 */
const KNOWN_VIOLATION_IDS = new Set([
  'color-contrast', // serious -- nav/footer/product text fails contrast ratio
  'empty-heading', // minor -- cart page has an empty heading element
  'image-alt', // critical -- product thumbnails have no alt text
  'landmark-one-main', // moderate -- no <main> landmark wrapping content
  'link-name', // serious -- some icon-only links have no accessible text
  'page-has-heading-one', // moderate -- no <h1> anywhere on the page
  'region', // moderate -- page content isn't contained by landmarks
]);

async function assertKnownViolationsOnly(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const violationIds = results.violations.map((v) => v.id);

  const unexpected = violationIds.filter((id) => !KNOWN_VIOLATION_IDS.has(id));
  expect(unexpected, 'a NEW a11y violation type appeared that is not in the known allowlist').toEqual([]);
  expect(violationIds, 'the always-present critical image-alt violation is missing').toContain('image-alt');
}

test.describe('Accessibility', () => {
  test(
    'Home page has no accessibility violations beyond the known baseline',
    { tag: ['@a11y', '@regression'] },
    async ({ page, homePage }) => {
      await homePage.open();
      expect(await homePage.isLoaded()).toBe(true);

      await assertKnownViolationsOnly(page);
    }
  );

  test(
    'Product detail page has no accessibility violations beyond the known baseline',
    { tag: ['@a11y', '@regression'] },
    async ({ page, productDetailPage }) => {
      await productDetailPage.open(NOKIA_ID);
      expect(await productDetailPage.isLoaded()).toBe(true);

      await assertKnownViolationsOnly(page);
    }
  );

  test(
    'Cart page has no accessibility violations beyond the known baseline',
    { tag: ['@a11y', '@regression'] },
    async ({ page, cartPage }) => {
      await cartPage.open();
      expect(await cartPage.isLoaded()).toBe(true);

      await assertKnownViolationsOnly(page);
    }
  );
});
