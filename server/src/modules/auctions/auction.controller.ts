import type { Request, Response } from 'express';
import { AuctionService } from './auction.service.js';
import {
  createAuctionSchema,
  updateAuctionSchema,
  auctionListQuerySchema,
} from './auction.schema.js';
import { UnauthorizedError } from '../../lib/errors.js';

export async function createAuction(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'UNAUTHENTICATED');
  }

  const validated = createAuctionSchema.parse(req.body);
  const auction = await AuctionService.create(req.user.id, validated);
  res.status(201).json({ auction });
}

export async function getAuction(req: Request, res: Response): Promise<void> {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Auction ID is required' } });
    return;
  }

  const result = await AuctionService.getById(id);
  res.status(200).json(result);
}

export async function updateAuction(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'UNAUTHENTICATED');
  }

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Auction ID is required' } });
    return;
  }

  const validated = updateAuctionSchema.parse(req.body);
  const auction = await AuctionService.update(id, req.user.id, validated);
  res.status(200).json({ auction });
}

export async function cancelAuction(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'UNAUTHENTICATED');
  }

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Auction ID is required' } });
    return;
  }

  const isAdmin = req.user.roles.includes('admin');
  const auction = await AuctionService.cancel(id, req.user.id, isAdmin);
  res.status(200).json({ auction });
}

export async function listAuctions(req: Request, res: Response): Promise<void> {
  const validated = auctionListQuerySchema.parse(req.query);
  const result = await AuctionService.list(validated);
  res.status(200).json(result);
}
