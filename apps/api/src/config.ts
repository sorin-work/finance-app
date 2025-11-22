import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
});

export interface Config {
  env: 'development' | 'test' | 'production';
  port: number;
  logLevel: string;
  databaseUrl: string;
  jwtSecret: string;
  sessionTtlDays: number;
  cookieSecure: boolean;
  bcryptRounds: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid environment: ${problems}`);
  }
  const e = parsed.data;
  return {
    env: e.NODE_ENV,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    databaseUrl: e.DATABASE_URL,
    jwtSecret: e.JWT_SECRET,
    sessionTtlDays: e.SESSION_TTL_DAYS,
    cookieSecure: e.COOKIE_SECURE,
    bcryptRounds: e.BCRYPT_ROUNDS,
  };
}
