import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

// Load root or local .env when not running an isolated test suite
const isTestRuntime =
  process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

if (!isTestRuntime && typeof process.loadEnvFile === 'function') {
  const candidates = [
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  const envPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (envPath) {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // .env file might not be readable in some environments (e.g. CI)
    }
  }
}

export function normalizeMongoUri(uri: string, defaultDbName = 'nilami'): string {
  let normalized = uri.trim();

  // If user copied an Atlas connection string with local replicaSet=rs0 appended,
  // strip replicaSet=rs0 so Atlas can resolve its internal shard replica sets
  if (normalized.startsWith('mongodb+srv://') && normalized.includes('replicaSet=rs0')) {
    normalized = normalized
      .replace(/[?&]replicaSet=rs0(&|$)/, (_, p1: string) => (p1 === '&' ? '?' : ''))
      .replace(/\?$/, '');
  }

  // Ensure mongodb+srv URIs without an explicit database path target `/nilami` instead of `test`
  if (normalized.startsWith('mongodb+srv://')) {
    const schemeEnd = 'mongodb+srv://'.length;
    const slashIndex = normalized.indexOf('/', schemeEnd);
    const queryIndex = normalized.indexOf('?', schemeEnd);
    if (slashIndex === -1) {
      normalized =
        queryIndex === -1
          ? `${normalized}/${defaultDbName}`
          : `${normalized.slice(0, queryIndex)}/${defaultDbName}${normalized.slice(queryIndex)}`;
    } else if (
      slashIndex === normalized.length - 1 ||
      normalized[slashIndex + 1] === '?'
    ) {
      normalized = `${normalized.slice(0, slashIndex + 1)}${defaultDbName}${normalized.slice(slashIndex + 1)}`;
    }
  }

  return normalized;
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
  MONGODB_DB_NAME: z.string().min(1).default('nilami'),
  MONGODB_URI: z
    .string()
    .min(1)
    .default('mongodb://127.0.0.1:27018/nilami?replicaSet=rs0')
    .transform((val) => normalizeMongoUri(val)),
  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6380'),
  JWT_ACCESS_SECRET: z.string().min(16).default('change-me-32+chars-change-me-32+chars'),
  JWT_REFRESH_SECRET: z.string().min(16).default('change-me-too-32+chars-change-me-too'),
  ACCESS_TTL: z.string().default('15m'),
  REFRESH_TTL_DAYS: z.coerce.number().default(30),
  IP_HASH_SECRET: z.string().default('change-me-3'),
  SMTP_HOST: z.string().default('127.0.0.1'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_SECURE: z
    .preprocess((val) => {
      if (typeof val === 'string') return val.toLowerCase() === 'true';
      return val;
    }, z.boolean())
    .optional(),
  SMTP_SERVICE: z.string().optional().default(''),
  MAIL_FROM: z.string().default('Nilami <no-reply@nilami.local>'),
  STORAGE_DRIVER: z.enum(['local', 'cloudinary', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  CLOUDINARY_URL: z.string().optional().default(''),
  AWS_ACCESS_KEY_ID: z.string().optional().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(''),
  AWS_REGION: z.string().optional().default('ap-south-1'),
  AWS_S3_BUCKET: z.string().optional().default(''),
  AWS_S3_ENDPOINT: z.string().optional().default(''),
  AWS_S3_PUBLIC_URL: z.string().optional().default(''),
  PAYMENT_PROVIDER: z.enum(['stripe', 'razorpay', 'mock']).default('stripe'),
  CURRENCY: z.string().default('INR'),
  STRIPE_SECRET_KEY: z.string().default('sk_test_xxx'),
  STRIPE_WEBHOOK_SECRET: z.string().default('whsec_xxx'),
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
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

