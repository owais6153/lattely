const DEVELOPMENT = 'development';

function environmentString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  return fallback;
}

function positiveInteger(value: unknown, fallback: number, name: string) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function nonNegativeInteger(value: unknown, fallback: number, name: string) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return parsed;
}

function booleanValue(value: unknown, fallback: boolean) {
  if (value == null || value === '') return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new Error('Boolean environment values must be true or false.');
}

export function validateEnvironment(config: Record<string, unknown>) {
  const appEnv = environmentString(
    config.APP_ENV ?? config.NODE_ENV,
    DEVELOPMENT,
  );
  const production = appEnv === 'production';
  const required = [
    'DB_HOST',
    'DB_USER',
    'DB_PASS',
    'DB_NAME',
    'JWT_ACCESS_SECRET',
  ];

  if (production) {
    required.push(
      'CORS_ORIGINS',
      'MAIL_HOST',
      'MAIL_USER',
      'MAIL_PASS',
      'MAIL_FROM',
      'GOOGLE_PLACES_API_KEY',
      'AGORA_APP_ID',
      'AGORA_APP_CERT',
      'OTP_HASH_SECRET',
    );
  }

  const missing = required.filter(
    (name) => !environmentString(config[name]).trim(),
  );
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const jwtSecret = environmentString(config.JWT_ACCESS_SECRET);
  if (production && jwtSecret.length < 32) {
    throw new Error(
      'JWT_ACCESS_SECRET must contain at least 32 characters in production.',
    );
  }

  if (production && environmentString(config.OTP_HASH_SECRET).length < 32) {
    throw new Error(
      'OTP_HASH_SECRET must contain at least 32 characters in production.',
    );
  }

  const synchronize = booleanValue(config.DB_SYNCHRONIZE, !production);
  if (production && synchronize) {
    throw new Error('DB_SYNCHRONIZE cannot be enabled in production.');
  }

  return {
    ...config,
    APP_ENV: appEnv,
    APP_HOST: environmentString(config.APP_HOST, '0.0.0.0'),
    APP_PORT: positiveInteger(config.APP_PORT, 3000, 'APP_PORT'),
    DB_PORT: positiveInteger(config.DB_PORT, 3306, 'DB_PORT'),
    DB_SYNCHRONIZE: synchronize,
    DB_RUN_MIGRATIONS: booleanValue(config.DB_RUN_MIGRATIONS, production),
    JWT_ACCESS_TTL_MINUTES: positiveInteger(
      config.JWT_ACCESS_TTL_MINUTES,
      15,
      'JWT_ACCESS_TTL_MINUTES',
    ),
    JWT_REFRESH_TTL_DAYS: positiveInteger(
      config.JWT_REFRESH_TTL_DAYS,
      30,
      'JWT_REFRESH_TTL_DAYS',
    ),
    MAX_REEL_MB: positiveInteger(config.MAX_REEL_MB, 100, 'MAX_REEL_MB'),
    GOOGLE_PLACES_TIMEOUT_MS: positiveInteger(
      config.GOOGLE_PLACES_TIMEOUT_MS,
      10000,
      'GOOGLE_PLACES_TIMEOUT_MS',
    ),
    AGORA_TOKEN_TTL_SEC: positiveInteger(
      config.AGORA_TOKEN_TTL_SEC,
      120,
      'AGORA_TOKEN_TTL_SEC',
    ),
    OTP_MAX_ATTEMPTS: positiveInteger(
      config.OTP_MAX_ATTEMPTS,
      5,
      'OTP_MAX_ATTEMPTS',
    ),
    COFFEE_REQUESTS_PER_HOUR: positiveInteger(
      config.COFFEE_REQUESTS_PER_HOUR,
      5,
      'COFFEE_REQUESTS_PER_HOUR',
    ),
    COFFEE_REQUESTS_PER_DAY: positiveInteger(
      config.COFFEE_REQUESTS_PER_DAY,
      15,
      'COFFEE_REQUESTS_PER_DAY',
    ),
    THROTTLE_TTL_MS: positiveInteger(
      config.THROTTLE_TTL_MS,
      60000,
      'THROTTLE_TTL_MS',
    ),
    THROTTLE_LIMIT: positiveInteger(
      config.THROTTLE_LIMIT,
      120,
      'THROTTLE_LIMIT',
    ),
    TRUST_PROXY_HOPS: nonNegativeInteger(
      config.TRUST_PROXY_HOPS,
      0,
      'TRUST_PROXY_HOPS',
    ),
  };
}
