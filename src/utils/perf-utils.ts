import { Page } from '@playwright/test';

export interface NavigationTiming {
  domContentLoadedMs: number;
  loadEventMs: number;
}

/** Reads the browser's own Navigation Timing entry for the current page. */
export async function getNavigationTiming(page: Page): Promise<NavigationTiming> {
  return page.evaluate(() => {
    const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return {
      domContentLoadedMs: nav.domContentLoadedEventEnd,
      loadEventMs: nav.loadEventEnd,
    };
  });
}
