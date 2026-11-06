import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { BidService } from './bid.service.js';
import { placeBidSchema } from './bid.schema.js';
import { UnauthorizedError } from '../../lib/errors.js';

export async function placeBid(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required to bid', 'UNAUTHENTICATED');
  }

  const rawAuctionId = req.params.id;
  const auctionId = Array.isArray(rawAuctionId) ? rawAuctionId[0] : rawAuctionId;
  if (!auctionId) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Auction ID is required' } });
    return;
  }

  const validated = placeBidSchema.parse(req.body);

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const rawUa = req.headers['user-agent'] || 'unknown';
  const userAgentHash = crypto.createHash('sha256').update(rawUa).digest('hex').slice(0, 16);

  const result = await BidService.placeBid({
    auctionId,
    bidderId: req.user.id,
    amount: validated.amount,
    idempotencyKey: validated.idempotencyKey,
    ip,
    userAgentHash,
  });

  res.status(201).json(result);
}

export async function getAuctionBids(req: Request, res: Response): Promise<void> {
  const rawAuctionId = req.params.id;
  const auctionId = Array.isArray(rawAuctionId) ? rawAuctionId[0] : rawAuctionId;
  if (!auctionId) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Auction ID is required' } });
    return;
  }

  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '20'), 10);

  const result = await BidService.getAuctionBids(auctionId, page, limit);
  res.status(200).json(result);
}

export async function getMyBids(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'UNAUTHENTICATED');
  }

  const result = await BidService.getMyBids(req.user.id);
  res.status(200).json({ bids: result });
}

export async function getMyWins(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'UNAUTHENTICATED');
  }

  const result = await BidService.getMyWins(req.user.id);
  res.status(200).json({ wins: result });
}

