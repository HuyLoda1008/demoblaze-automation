import { APIRequestContext } from '@playwright/test';
import { z } from 'zod';

/**
 * Centralizes every call to api.demoblaze.com behind named, typed methods
 * instead of each spec building its own `request.get/post(...)` calls
 * inline, AND validates every response against a Zod schema at runtime --
 * the TS types alone (`z.infer<...>`) only catch a shape mismatch at
 * compile time against what the code *assumes*; they say nothing about
 * what the server actually sent back on a given run. `.parse()` /
 * `.safeParse()` below is what actually checks that.
 *
 * Shapes and status codes were confirmed live before writing this (not
 * guessed) -- including that DemoBlaze does NOT follow REST status-code
 * conventions for most business-logic errors:
 *   GET  /entries      -> 200 { Items: [{ id, title, price, cat, desc, img }, ...] }
 *   POST /view {id}    -> 200 { id, title, price, cat, desc, img } on a known id
 *                       -> 200 { errorMessage: "Not found." } for an unknown id
 *                          (NOT 404 -- verified live)
 *                       -> 200 { errorMessage: "Product not found." } for a
 *                          missing `id` field (a *different* message than the
 *                          unknown-id case above, for what reads like the same
 *                          underlying condition -- verified live, not a typo
 *                          on this suite's part)
 *                       -> 500 (a genuine unhandled server exception, HTML
 *                          error page, not JSON) when `id` isn't parseable as
 *                          a number, e.g. "abc" -- verified live; this is a
 *                          real DemoBlaze bug, documented here rather than
 *                          silently tolerated
 *   GET  /view?id=1    -> 405 Method Not Allowed -- the endpoint requires POST
 *   POST /login {username, password: base64(password)}
 *        -> 200 with a JSON-encoded token STRING on success, e.g.
 *           "Auth_token: <base64>" (a JSON string, not an object -- easy to
 *           misdiagnose as "not JSON" if you only check `typeof body ===
 *           'object'`; verified live via an actual CI run using this
 *           client, which caught a wrong assumption made from an earlier,
 *           flakier manual recon)
 *        -> 200 with a JSON OBJECT `{ errorMessage: string }` on failure
 *           (e.g. "Wrong password.", "User does not exist.")
 *        -> 200 with `{ errorMessage: "Bad parameter, missing username" }`
 *           when *either* username or password is missing -- verified live
 *           that this message says "missing username" even when username
 *           was provided and password was the one left out. A real
 *           DemoBlaze message-labeling bug, not a mistake in this client.
 *   GET  /<nonexistent path> -> 404, plain HTML (Werkzeug's default error
 *        page, not a DemoBlaze-authored JSON response) -- the one case here
 *        that *does* use a conventional HTTP status code.
 */

export const ProductSchema = z.object({
  id: z.number(),
  title: z.string(),
  price: z.number(),
  cat: z.string(),
  desc: z.string(),
  img: z.string(),
});
export type Product = z.infer<typeof ProductSchema>;

export const ProductCatalogSchema = z.object({
  Items: z.array(ProductSchema),
});
export type ProductCatalog = z.infer<typeof ProductCatalogSchema>;

export const ApiErrorSchema = z.object({ errorMessage: z.string() });

/** Matches the confirmed live shape of a successful /login response, not
 * just "any non-empty string" -- catches a schema/format regression that a
 * looser check would silently pass through. */
export const AuthTokenSchema = z.string().regex(/^Auth_token: /);

export interface LoginResult {
  status: number;
  /** True only when the response contained a valid auth token --
   * business-logic success, NOT merely that the HTTP status was 2xx.
   * DemoBlaze returns 200 for failed logins too (wrong password,
   * nonexistent user), so a naive `res.ok()` would be `true` in both the
   * success and failure branches and assert nothing meaningful. */
  ok: boolean;
  /** The JSON-string token body on success (e.g. "Auth_token: <base64>"); null on failure. */
  authToken: string | null;
  /** The `errorMessage` field on failure (e.g. "Wrong password."); null on success. */
  errorMessage: string | null;
}

export interface GetProductResult {
  status: number;
  /** True only when the body validated against ProductSchema. */
  ok: boolean;
  product: Product | null;
  /** Populated for the documented `{errorMessage}` failure shapes. Left
   * null for the 500/non-JSON case -- see `rawBody`. */
  errorMessage: string | null;
  /** Populated only when the response wasn't valid JSON at all (the
   * non-numeric-id 500 case), so callers can assert on the raw text
   * without this client guessing at HTML error-page structure. */
  rawBody: string | null;
}

export class DemoblazeApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string
  ) {}

  /** Throws (via Zod) if the response doesn't match ProductCatalogSchema --
   * every caller gets schema validation for free, not just a dedicated
   * schema test. */
  async getProductCatalog(): Promise<ProductCatalog> {
    const res = await this.request.get(`${this.baseUrl}/entries`);
    const body: unknown = await res.json();
    return ProductCatalogSchema.parse(body);
  }

  async getProduct(id: number | string): Promise<GetProductResult> {
    const res = await this.request.post(`${this.baseUrl}/view`, { data: { id: String(id) } });
    const status = res.status();

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      // The non-numeric-id 500 response is an HTML error page, not JSON.
      return { status, ok: false, product: null, errorMessage: null, rawBody: await res.text() };
    }

    const productParsed = ProductSchema.safeParse(body);
    if (productParsed.success) {
      return { status, ok: true, product: productParsed.data, errorMessage: null, rawBody: null };
    }
    const errorParsed = ApiErrorSchema.safeParse(body);
    return {
      status,
      ok: false,
      product: null,
      errorMessage: errorParsed.success ? errorParsed.data.errorMessage : null,
      rawBody: null,
    };
  }

  /** Exists to exercise the documented "GET is rejected" negative case, not
   * to fetch data. Returns the body too (Werkzeug's default HTML error
   * page) so callers can assert the message matches the status, not just
   * the status alone. */
  async getProductViaGet(id: number | string): Promise<{ status: number; body: string }> {
    const res = await this.request.get(`${this.baseUrl}/view?id=${id}`);
    return { status: res.status(), body: await res.text() };
  }

  /** Generic status+body check for paths that aren't a real DemoBlaze API
   * operation (e.g. confirming an unknown route 404s) -- kept on the client
   * rather than a raw `request.get()` in the test, per CODE_CONVENTIONS'
   * "every api.demoblaze.com call goes through DemoblazeApiClient". */
  async getRaw(path: string): Promise<{ status: number; body: string }> {
    const res = await this.request.get(`${this.baseUrl}${path}`);
    return { status: res.status(), body: await res.text() };
  }

  async login(username: string, password: string): Promise<LoginResult> {
    const res = await this.request.post(`${this.baseUrl}/login`, {
      data: { username, password: Buffer.from(password).toString('base64') },
    });
    const status = res.status();
    // Body is always valid JSON, but its *shape* differs by outcome: a bare
    // string on success, an object with `errorMessage` on failure.
    const body: unknown = await res.json();

    const tokenParsed = AuthTokenSchema.safeParse(body);
    if (tokenParsed.success) {
      return { status, ok: true, authToken: tokenParsed.data, errorMessage: null };
    }
    const errorParsed = ApiErrorSchema.safeParse(body);
    return {
      status,
      ok: false,
      authToken: null,
      errorMessage: errorParsed.success ? errorParsed.data.errorMessage : null,
    };
  }
}
