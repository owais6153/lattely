import { validateEnvironment } from './env.validation';

const productionEnvironment = {
  APP_ENV: 'production',
  DB_HOST: 'database',
  DB_USER: 'lattely',
  DB_PASS: 'secret',
  DB_NAME: 'lattely',
  JWT_ACCESS_SECRET: 'a-production-secret-with-32-characters',
  CORS_ORIGINS: 'https://app.example.com',
  MAIL_HOST: 'smtp.example.com',
  MAIL_USER: 'mailer',
  MAIL_PASS: 'secret',
  MAIL_FROM: 'Lattely <support@example.com>',
  GOOGLE_PLACES_API_KEY: 'places-key',
  AGORA_APP_ID: 'agora-app',
  AGORA_APP_CERT: 'agora-certificate',
  OTP_HASH_SECRET: 'an-independent-secret-with-32-characters',
};

describe('validateEnvironment', () => {
  it('applies production-safe defaults', () => {
    expect(validateEnvironment(productionEnvironment)).toMatchObject({
      APP_ENV: 'production',
      APP_PORT: 3000,
      DB_PORT: 3306,
      DB_SYNCHRONIZE: false,
      DB_RUN_MIGRATIONS: true,
      JWT_ACCESS_TTL_MINUTES: 15,
      JWT_REFRESH_TTL_DAYS: 30,
    });
  });

  it('rejects schema synchronization in production', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        DB_SYNCHRONIZE: 'true',
      }),
    ).toThrow('DB_SYNCHRONIZE cannot be enabled in production.');
  });

  it('reports missing production integrations', () => {
    expect(() =>
      validateEnvironment({ ...productionEnvironment, AGORA_APP_ID: '' }),
    ).toThrow('AGORA_APP_ID');
  });
});
