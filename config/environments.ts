import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, 'env', 'prod.env') });

export interface EnvConfig {
  envName: string;
  baseUrl: string;
  apiBaseUrl: string;
  testUser: {
    username: string;
    password: string;
  };
}

// Single real environment (DemoBlaze has no staging instance), but the
// shape keeps everything env-specific in one place, selected by TEST_ENV,
// so the test suite itself never hardcodes a host.
const environments: Record<string, EnvConfig> = {
  demoblaze_prod: {
    envName: 'demoblaze_prod',
    baseUrl: process.env.BASE_URL ?? 'https://www.demoblaze.com',
    apiBaseUrl: process.env.API_BASE_URL ?? 'https://api.demoblaze.com',
    testUser: {
      username: process.env.TEST_USER ?? '',
      password: process.env.TEST_PASSWORD ?? '',
    },
  },
};

export function getEnvConfig(): EnvConfig {
  const envName = process.env.TEST_ENV ?? 'demoblaze_prod';
  const config = environments[envName];
  if (!config) {
    const available = Object.keys(environments).join(', ');
    throw new Error(`Unknown TEST_ENV '${envName}'. Available environments: ${available}`);
  }
  return config;
}
