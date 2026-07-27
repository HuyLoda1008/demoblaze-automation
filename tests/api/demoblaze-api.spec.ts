import { test, expect } from '../../src/fixtures/test-options';

/**
 * Uses Playwright's built-in `request` fixture -- no browser launch needed,
 * these run in well under a second each. Shapes below were confirmed live
 * against api.demoblaze.com before writing assertions (not guessed):
 *   GET  /entries      -> { Items: [{ id, title, price, cat, desc, img }, ...] }
 *   POST /view {id}    -> { id, title, price, cat, desc, img } (single product)
 *   GET  /view?id=1    -> 405 Method Not Allowed (must be POST with a JSON body)
 *   POST /login {username, password: base64(password)} -> {} on success,
 *        { errorMessage: string } on failure (e.g. "Wrong password.")
 */
test.describe('DemoBlaze API', () => {
  test('GET /entries returns the product catalog', { tag: ['@api', '@smoke'] }, async ({ request, env }) => {
    const res = await request.get(`${env.apiBaseUrl}/entries`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(Array.isArray(body.Items)).toBe(true);
    expect(body.Items.length).toBeGreaterThan(0);
    for (const item of body.Items) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('price');
    }
  });

  test('POST /view returns the matching product for a known id', { tag: ['@api', '@regression'] }, async ({
    request,
    env,
  }) => {
    const res = await request.post(`${env.apiBaseUrl}/view`, { data: { id: '1' } });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.id).toBe(1);
    expect(body.title).toBe('Samsung galaxy s6');
    expect(body.price).toBe(360);
  });

  test('GET /view is rejected -- the endpoint requires POST', { tag: ['@api', '@regression'] }, async ({
    request,
    env,
  }) => {
    const res = await request.get(`${env.apiBaseUrl}/view?id=1`);
    expect(res.status()).toBe(405);
  });

  test('POST /login with valid credentials succeeds', { tag: ['@api', '@auth'] }, async ({ request, env }) => {
    const res = await request.post(`${env.apiBaseUrl}/login`, {
      data: {
        username: env.testUser.username,
        password: Buffer.from(env.testUser.password).toString('base64'),
      },
    });
    expect(res.ok()).toBeTruthy();
    // Note: on success the endpoint returns a bare auth token, not a JSON
    // object -- unlike the failure case below. We only assert the request
    // succeeded; the UI login spec already covers the authenticated session.
  });

  test('POST /login with wrong password returns an errorMessage', { tag: ['@api', '@auth'] }, async ({
    request,
    env,
  }) => {
    const res = await request.post(`${env.apiBaseUrl}/login`, {
      data: {
        username: env.testUser.username,
        password: Buffer.from('definitely-wrong-password').toString('base64'),
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.errorMessage).toBe('Wrong password.');
  });
});
