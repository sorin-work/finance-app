import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export interface Config {
  env: 'development' | 'test' | 'production';
  port: number;
  logLevel: string;
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
  };
}
