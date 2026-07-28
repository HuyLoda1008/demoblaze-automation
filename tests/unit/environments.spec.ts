import { test, expect } from '@playwright/test';
import { getEnvConfig } from '../../config/environments';

/**
 * Pure branching logic, re-evaluated fresh on every getEnvConfig() call
 * (unlike the per-env baseUrl/apiBaseUrl/testUser fields, which are read
 * from process.env once at module import time -- not retested here since
 * asserting a specific default would depend on whether config/env/prod.env
 * happened to be loaded first, making the test's outcome depend on
 * environment rather than on the code under test).
 */
test.describe('getEnvConfig', () => {
  const originalTestEnv = process.env.TEST_ENV;

  test.afterEach(() => {
    if (originalTestEnv === undefined) delete process.env.TEST_ENV;
    else process.env.TEST_ENV = originalTestEnv;
  });

  test('defaults to demoblaze_prod when TEST_ENV is unset', () => {
    delete process.env.TEST_ENV;
    const config = getEnvConfig();
    expect(config.envName).toBe('demoblaze_prod');
    expect(config.baseUrl).toMatch(/^https?:\/\//);
    expect(config.apiBaseUrl).toMatch(/^https?:\/\//);
  });

  test('an explicit TEST_ENV=demoblaze_prod resolves the same block', () => {
    process.env.TEST_ENV = 'demoblaze_prod';
    expect(getEnvConfig().envName).toBe('demoblaze_prod');
  });

  test('an unknown TEST_ENV throws, listing the available environments', () => {
    process.env.TEST_ENV = 'nonexistent_env_zzz';
    expect(() => getEnvConfig()).toThrow(
      "Unknown TEST_ENV 'nonexistent_env_zzz'. Available environments: demoblaze_prod"
    );
  });
});
