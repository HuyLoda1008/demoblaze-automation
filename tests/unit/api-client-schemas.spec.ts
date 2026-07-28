import { test, expect } from '@playwright/test';
import {
  ProductSchema,
  ProductCatalogSchema,
  ApiErrorSchema,
  AuthTokenSchema,
} from '../../src/utils/api-client';

/**
 * Pure logic, zero network/browser needed -- the Zod schemas in
 * api-client.ts are the actual runtime contract every API test relies on
 * (see demoblaze-api.spec.ts), so a regression here would silently weaken
 * every test that imports them. Fixtures below mirror the confirmed-live
 * shapes documented at the top of api-client.ts, not invented ones.
 */
test.describe('ProductSchema', () => {
  const validProduct = {
    id: 1,
    title: 'Samsung galaxy s6',
    price: 360,
    cat: 'phone',
    desc: 'Some description',
    img: 'img/samsung.jpg',
  };

  test('accepts a well-formed product', () => {
    expect(ProductSchema.safeParse(validProduct).success).toBe(true);
  });

  test('rejects a product missing a required field', () => {
    const withoutImg: Record<string, unknown> = { ...validProduct };
    delete withoutImg.img;
    expect(ProductSchema.safeParse(withoutImg).success).toBe(false);
  });

  test('rejects a product with the wrong type for price', () => {
    const wrongType = { ...validProduct, price: '360' };
    expect(ProductSchema.safeParse(wrongType).success).toBe(false);
  });
});

test.describe('ProductCatalogSchema', () => {
  test('accepts an Items array of valid products', () => {
    const catalog = {
      Items: [{ id: 1, title: 'x', price: 1, cat: 'y', desc: 'z', img: 'i' }],
    };
    expect(ProductCatalogSchema.safeParse(catalog).success).toBe(true);
  });

  test('accepts an empty Items array', () => {
    expect(ProductCatalogSchema.safeParse({ Items: [] }).success).toBe(true);
  });

  test('rejects a payload missing the Items field entirely', () => {
    expect(ProductCatalogSchema.safeParse({}).success).toBe(false);
  });

  test('rejects a payload where one item in Items is malformed', () => {
    const catalog = {
      Items: [
        { id: 1, title: 'x', price: 1, cat: 'y', desc: 'z', img: 'i' },
        { id: 2, title: 'bad' }, // missing price/cat/desc/img
      ],
    };
    expect(ProductCatalogSchema.safeParse(catalog).success).toBe(false);
  });
});

test.describe('ApiErrorSchema', () => {
  test('accepts { errorMessage: string }', () => {
    expect(ApiErrorSchema.safeParse({ errorMessage: 'Not found.' }).success).toBe(true);
  });

  test('rejects a payload without errorMessage', () => {
    expect(ApiErrorSchema.safeParse({ message: 'Not found.' }).success).toBe(false);
  });

  test('rejects errorMessage with the wrong type', () => {
    expect(ApiErrorSchema.safeParse({ errorMessage: 404 }).success).toBe(false);
  });
});

test.describe('AuthTokenSchema', () => {
  test('accepts a string with the "Auth_token: " prefix', () => {
    expect(AuthTokenSchema.safeParse('Auth_token: c29tZS10b2tlbg==').success).toBe(true);
  });

  test('rejects a plain string without the prefix', () => {
    // This is the exact regression this schema exists to catch -- see the
    // JSON-string-token note in api-client.ts's header comment.
    expect(AuthTokenSchema.safeParse('c29tZS10b2tlbg==').success).toBe(false);
  });

  test('rejects a non-string value', () => {
    expect(AuthTokenSchema.safeParse({ token: 'Auth_token: x' }).success).toBe(false);
  });
});
