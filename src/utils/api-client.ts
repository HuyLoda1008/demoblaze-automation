import { APIRequestContext } from '@playwright/test';

/**
 * Centralizes every call to api.demoblaze.com behind named, typed methods
 * instead of each spec building its own `request.get/post(...)` calls
 * inline. Shapes below were confirmed live before writing this (not
 * guessed):
 *   GET  /entries      -> { Items: [{ id, title, price, cat, desc, img }, ...] }
 *   POST /view {id}    -> { id, title, price, cat, desc, img } (single product)
 *   GET  /view?id=1    -> 405 Method Not Allowed -- the endpoint requires POST
 *   POST /login {username, password: base64(password)}
 *        -> 200 with a JSON-encoded token STRING on success, e.g.
 *           "Auth_token: <base64>" (a JSON string, not an object -- easy to
 *           misdiagnose as "not JSON" if you only check `typeof body ===
 *           'object'`; verified live via an actual CI run using this
 *           client, which caught a wrong assumption made from an earlier,
 *           flakier manual recon)
 *        -> 200 with a JSON OBJECT `{ errorMessage: string }` on failure
 *           (e.g. "Wrong password.")
 */

export interface Product {
  id: number;
  title: string;
  price: number;
  cat: string;
  desc: string;
  img: string;
}

export interface ProductCatalog {
  Items: Product[];
}

export interface LoginResult {
  status: number;
  ok: boolean;
  /** The JSON-string token body on success (e.g. "Auth_token: <base64>"); null on failure. */
  authToken: string | null;
  /** The `errorMessage` field on failure (e.g. "Wrong password."); null on success. */
  errorMessage: string | null;
}

export class DemoblazeApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string
  ) {}

  async getProductCatalog(): Promise<ProductCatalog> {
    const res = await this.request.get(`${this.baseUrl}/entries`);
    return res.json();
  }

  async getProduct(id: number | string): Promise<Product> {
    const res = await this.request.post(`${this.baseUrl}/view`, { data: { id: String(id) } });
    return res.json();
  }

  /** Returns just the HTTP status -- exists to exercise the documented
   * "GET is rejected" negative case, not to fetch data. */
  async getProductViaGetStatus(id: number | string): Promise<number> {
    const res = await this.request.get(`${this.baseUrl}/view?id=${id}`);
    return res.status();
  }

  async login(username: string, password: string): Promise<LoginResult> {
    const res = await this.request.post(`${this.baseUrl}/login`, {
      data: { username, password: Buffer.from(password).toString('base64') },
    });
    // Body is always valid JSON, but its *shape* differs by outcome: a bare
    // string on success, an object with `errorMessage` on failure.
    const body: unknown = await res.json();
    if (typeof body === 'string') {
      return { status: res.status(), ok: res.ok(), authToken: body, errorMessage: null };
    }
    const errorMessage = (body as { errorMessage?: string } | null)?.errorMessage ?? null;
    return { status: res.status(), ok: res.ok(), authToken: null, errorMessage };
  }
}
