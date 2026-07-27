import { test, expect } from '../../src/fixtures/test-options';

/**
 * Uses the `apiClient` fixture (src/utils/api-client.ts) -- no browser
 * launch needed, these run in well under a second each. See api-client.ts
 * for the confirmed-live request/response shapes.
 */
test.describe('DemoBlaze API', () => {
  test('GET /entries returns the product catalog', { tag: ['@api', '@smoke'] }, async ({ apiClient }) => {
    const catalog = await apiClient.getProductCatalog();

    expect(Array.isArray(catalog.Items)).toBe(true);
    expect(catalog.Items.length).toBeGreaterThan(0);
    for (const item of catalog.Items) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('price');
    }
  });

  test('POST /view returns the matching product for a known id', { tag: ['@api', '@regression'] }, async ({
    apiClient,
  }) => {
    const product = await apiClient.getProduct(1);

    expect(product.id).toBe(1);
    expect(product.title).toBe('Samsung galaxy s6');
    expect(product.price).toBe(360);
  });

  test('GET /view is rejected -- the endpoint requires POST', { tag: ['@api', '@regression'] }, async ({
    apiClient,
  }) => {
    const status = await apiClient.getProductViaGetStatus(1);

    expect(status).toBe(405);
  });

  test('POST /login with valid credentials succeeds', { tag: ['@api', '@auth'] }, async ({ apiClient, env }) => {
    const result = await apiClient.login(env.testUser.username, env.testUser.password);

    expect(result.ok).toBeTruthy();
    expect(result.authToken).toContain('Auth_token');
    expect(result.errorMessage).toBeNull();
  });

  test('POST /login with wrong password returns an errorMessage', { tag: ['@api', '@auth'] }, async ({
    apiClient,
    env,
  }) => {
    const result = await apiClient.login(env.testUser.username, 'definitely-wrong-password');

    expect(result.ok).toBeTruthy();
    expect(result.errorMessage).toBe('Wrong password.');
    expect(result.authToken).toBeNull();
  });
});
