import { test, expect } from '../../src/fixtures/test-options';
import { ProductCatalogSchema } from '../../src/utils/api-client';

/**
 * Uses the `apiClient` fixture (src/utils/api-client.ts) -- no browser
 * launch needed, these run in well under a second each. See api-client.ts
 * for the confirmed-live request/response shapes, including that DemoBlaze
 * does NOT follow REST status-code conventions for most business-logic
 * errors (almost everything is 200 + an `errorMessage` field, not a 4xx).
 */
test.describe('DemoBlaze API', () => {
  test.describe('GET /entries', () => {
    test('returns the product catalog', { tag: ['@api', '@smoke'] }, async ({ apiClient }) => {
      // getProductCatalog() already throws via Zod if the shape doesn't
      // match ProductCatalogSchema -- reaching this line at all is itself
      // schema validation, not just the property spot-checks below.
      const catalog = await apiClient.getProductCatalog();

      expect(catalog.Items.length).toBeGreaterThan(0);
    });

    test(
      'response validates against ProductCatalogSchema (explicit check)',
      { tag: ['@api', '@regression'] },
      async ({ apiClient }) => {
        const catalog = await apiClient.getProductCatalog();

        // Redundant with getProductCatalog()'s internal .parse(), but
        // explicit here so a reviewer sees schema conformance asserted as
        // its own named test case, not just implied by another test not
        // throwing.
        const result = ProductCatalogSchema.safeParse(catalog);
        expect(result.success).toBe(true);
      }
    );
  });

  test.describe('POST /view', () => {
    test(
      'returns the matching product for a known id',
      { tag: ['@api', '@regression'] },
      async ({ apiClient }) => {
        const result = await apiClient.getProduct(1);

        expect(result.status).toBe(200);
        expect(result.ok).toBe(true);
        expect(result.product?.id).toBe(1);
        expect(result.product?.title).toBe('Samsung galaxy s6');
        expect(result.product?.price).toBe(360);
      }
    );

    test(
      'a nonexistent id returns 200 with an errorMessage, not a 404',
      { tag: ['@api', '@regression'] },
      async ({ apiClient }) => {
        const result = await apiClient.getProduct(999_999);

        expect(result.status).toBe(200);
        expect(result.ok).toBe(false);
        expect(result.product).toBeNull();
        expect(result.errorMessage).toBe('Not found.');
      }
    );

    test(
      'a missing id field returns a DIFFERENT errorMessage than the nonexistent-id case',
      { tag: ['@api', '@regression'] },
      async ({ request, env }) => {
        // Deliberately bypasses DemoblazeApiClient.getProduct() (which
        // always sends an id) to send a body with the field omitted
        // entirely -- confirmed live this produces a different message
        // ("Product not found.") than an id that's merely unrecognized
        // ("Not found."), not a typo in this suite.
        const res = await request.post(`${env.apiBaseUrl}/view`, { data: {} });
        const body = await res.json();

        expect(res.status()).toBe(200);
        expect(body.errorMessage).toBe('Product not found.');
      }
    );

    test(
      'a non-numeric id crashes the server with a 500 -- a real DemoBlaze bug, not tolerated silently',
      { tag: ['@api', '@regression'] },
      async ({ apiClient }) => {
        const result = await apiClient.getProduct('abc');

        expect(result.status).toBe(500);
        expect(result.product).toBeNull();
        // The 500 response is an HTML error page, not JSON -- rawBody is
        // how the client surfaces that instead of throwing on res.json().
        expect(result.rawBody).toContain('Internal Server Error');
      }
    );
  });

  test(
    'GET /view is rejected -- the endpoint requires POST',
    { tag: ['@api', '@regression'] },
    async ({ apiClient }) => {
      const result = await apiClient.getProductViaGet(1);

      expect(result.status).toBe(405);
      // Werkzeug's default 405 page, confirmed live -- asserting the
      // message matches the status, not just the status alone.
      expect(result.body).toContain('Method Not Allowed');
    }
  );

  test(
    'an unknown route returns a conventional 404 (unlike the /view business-logic errors above)',
    { tag: ['@api', '@regression'] },
    async ({ apiClient }) => {
      const result = await apiClient.getRaw('/this-route-does-not-exist');

      expect(result.status).toBe(404);
      // Werkzeug's default 404 page, confirmed live -- same reasoning as
      // the 405 case above.
      expect(result.body).toContain('Not Found');
    }
  );

  test.describe('POST /login', () => {
    test('valid credentials succeed', { tag: ['@api', '@auth'] }, async ({ apiClient, env }) => {
      const result = await apiClient.login(env.testUser.username, env.testUser.password);

      // status alone can't distinguish success from failure here (both
      // return 200 -- see the wrong-password/nonexistent-username cases
      // below), so `ok` (business-logic, derived from the token shape, not
      // res.ok()) is what actually carries the pass/fail signal.
      expect(result.status).toBe(200);
      expect(result.ok).toBe(true);
      expect(result.authToken).toContain('Auth_token');
      expect(result.errorMessage).toBeNull();
    });

    test('wrong password returns an errorMessage', { tag: ['@api', '@auth'] }, async ({ apiClient, env }) => {
      const result = await apiClient.login(env.testUser.username, 'definitely-wrong-password');

      // Same HTTP status (200) as the success case above -- errorMessage
      // and `ok: false` are the only signals that this login failed.
      expect(result.status).toBe(200);
      expect(result.ok).toBe(false);
      expect(result.errorMessage).toBe('Wrong password.');
      expect(result.authToken).toBeNull();
    });

    test(
      'a nonexistent username returns an errorMessage',
      { tag: ['@api', '@auth'] },
      async ({ apiClient }) => {
        const result = await apiClient.login('nonexistent_user_zzz_999', 'whatever123');

        expect(result.status).toBe(200);
        expect(result.ok).toBe(false);
        expect(result.errorMessage).toBe('User does not exist.');
      }
    );

    test(
      'a missing password reports "missing username" -- a real DemoBlaze message-labeling bug',
      { tag: ['@api', '@auth'] },
      async ({ request, env }) => {
        // Deliberately bypasses the client (which always base64-encodes and
        // sends a password) to omit the field entirely. Verified live: the
        // error message says "missing username" even though username WAS
        // provided and password is what's actually missing -- documenting
        // the bug's exact wording, not assuming a sensible one.
        const res = await request.post(`${env.apiBaseUrl}/login`, {
          data: { username: env.testUser.username },
        });
        const body = await res.json();

        expect(res.status()).toBe(200);
        expect(body.errorMessage).toBe('Bad parameter, missing username');
      }
    );
  });
});
