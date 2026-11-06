import { z } from 'zod';

export const createAuctionSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(10).max(5000),
    category: z.enum(['electronics', 'collectibles', 'art', 'fashion', 'vehicles', 'other']),
    condition: z.enum(['new', 'like_new', 'used_good', 'used_fair']),
    images: z
      .array(
        z.object({
          url: z.string().min(1),
          publicId: z.string().optional(),
        }),
      )
      .min(1, 'At least 1 image is required')
      .max(6, 'At most 6 images are allowed'),
    startingPrice: z.number().int().min(100, 'Starting price must be at least ₹1 (100 paise)'),
    reservePrice: z
      .number()
      .int()
      .min(100)
      .nullable()
      .optional(),
    minIncrement: z
      .number()
      .int()
      .min(100, 'Minimum increment must be at least ₹1 (100 paise)'),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  })
  .strict()
  .refine(
    (data) => {
      const starts = new Date(data.startsAt).getTime();
      const ends = new Date(data.endsAt).getTime();
      const nowMinusOneMin = Date.now() - 60 * 1000;

      if (starts < nowMinusOneMin) return false;
      const durationMs = ends - starts;
      const minDuration = 5 * 60 * 1000; // 5 min
      const maxDuration = 7 * 24 * 60 * 60 * 1000; // 7 days

      return durationMs >= minDuration && durationMs <= maxDuration;
    },
    {
      message:
        'startsAt must not be in the past and duration must be between 5 minutes and 7 days',
      path: ['endsAt'],
    },
  )
  .refine(
    (data) => {
      if (data.reservePrice !== null && data.reservePrice !== undefined) {
        return data.reservePrice >= data.startingPrice;
      }
      return true;
    },
    {
      message: 'reservePrice must be greater than or equal to startingPrice',
      path: ['reservePrice'],
    },
  );

export const updateAuctionSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().min(10).max(5000).optional(),
    category: z.enum(['electronics', 'collectibles', 'art', 'fashion', 'vehicles', 'other']).optional(),
    condition: z.enum(['new', 'like_new', 'used_good', 'used_fair']).optional(),
    images: z
      .array(
        z.object({
          url: z.string().min(1),
          publicId: z.string().optional(),
        }),
      )
      .min(1)
      .max(6)
      .optional(),
    startingPrice: z.number().int().min(100).optional(),
    reservePrice: z.number().int().min(100).nullable().optional(),
    minIncrement: z.number().int().min(100).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
  })
  .strict();

export const auctionListQuerySchema = z.object({
  q: z.string().trim().optional(),
  category: z.enum(['electronics', 'collectibles', 'art', 'fashion', 'vehicles', 'other']).optional(),
  status: z
    .enum([
      'scheduled',
      'active',
      'payment_pending',
      'completed',
      'payment_failed',
      'unsold',
      'cancelled',
    ])
    .optional(),
  minPrice: z.coerce.number().int().optional(),
  maxPrice: z.coerce.number().int().optional(),
  sort: z
    .enum(['endingSoon', 'newest', 'priceAsc', 'priceDesc', 'mostBids'])
    .default('endingSoon'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateAuctionInput = z.infer<typeof createAuctionSchema>;
export type UpdateAuctionInput = z.infer<typeof updateAuctionSchema>;
export type AuctionListQuery = z.infer<typeof auctionListQuerySchema>;

