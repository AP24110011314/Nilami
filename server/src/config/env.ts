import { z } from 'zod';

// Load .env if supported and available in the runtime environment
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    // .env file might not exist in some environments (e.g. CI)
  }
}

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce
    .number()
    .default(4000)
    .refine((val) => val !== 5000 && val !== 7000, {
      message: 'PORT cannot be 5000 or 7000 (reserved for macOS AirPlay Receiver)',
    }),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27018/nilami?replicaSet=rs0'),
  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6380'),
  JWT_ACCESS_SECRET: z.string().min(16).default('change-me-32+chars-change-me-32+chars'),
  JWT_REFRESH_SECRET: z.string().min(16).default('change-me-too-32+chars-change-me-too'),
  ACCESS_TTL: z.string().default('15m'),
  REFRESH_TTL_DAYS: z.coerce.number().default(30),
  IP_HASH_SECRET: z.string().default('change-me-3'),
  SMTP_HOST: z.string().default('127.0.0.1'),
  SMTP_PORT: z.coerce.number().default(1025),
  MAIL_FROM: z.string().default('Nilami <no-reply@nilami.local>'),
  STORAGE_DRIVER: z.enum(['local', 'cloudinary']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  CLOUDINARY_URL: z.string().optional().default(''),
  PAYMENT_PROVIDER: z.enum(['stripe', 'mock']).default('stripe'),
  STRIPE_SECRET_KEY: z.string().default('sk_test_xxx'),
  STRIPE_WEBHOOK_SECRET: z.string().default('whsec_xxx'),
  PAYMENT_WINDOW_MINUTES: z.coerce.number().default(2880),
  ANTI_SNIPE_WINDOW_MS: z.coerce.number().default(10000),
  ANTI_SNIPE_EXTEND_MS: z.coerce.number().default(30000),
  ANTI_SNIPE_MAX_EXTENSIONS: z.coerce.number().default(20),
  RUN_WORKER_IN_API: z
    .preprocess((val) => String(val).toLowerCase() === 'true', z.boolean())
    .default(false),
  LOG_LEVEL: z.string().default('debug'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(input: Record<string, unknown> = process.env): Env {
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Environment validation failed: ${errorDetails}`);
  }
  return parsed.data;
}

export const env: Env = validateEnv();
