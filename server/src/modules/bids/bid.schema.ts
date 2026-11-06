import { z } from 'zod';

export const placeBidSchema = z
  .object({
    amount: z
      .number({ required_error: 'Bid amount is required' })
      .int('Bid amount must be an integer paise')
      .min(100, 'Bid amount must be at least ₹1 (100 paise)'),
    idempotencyKey: z
      .string({ required_error: 'Idempotency key is required' })
      .min(1, 'Idempotency key cannot be empty')
      .max(100),
  })
  .strict();

export type PlaceBidInput = z.infer<typeof placeBidSchema>;

