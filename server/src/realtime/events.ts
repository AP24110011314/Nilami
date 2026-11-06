import type { Server } from 'socket.io';
import { auctionRoom, userRoom, ADMIN_ROOM } from './rooms.js';
import { getEmitter } from './emitter.js';
import { logger } from '../config/logger.js';

let registeredIO: Server | null = null;

export function registerIO(io: Server | null): void {
  registeredIO = io;
}

export function maskName(name?: string | null): string {
  if (!name) return 'A***s';
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'A***s';
  if (trimmed.length === 1) return `${trimmed.toUpperCase()}***`;
  const first = trimmed[0]!.toUpperCase();
  const last = trimmed[trimmed.length - 1]!.toLowerCase();
  return `${first}***${last}`;
}

export interface BidUpdatedPayload {
  auctionId: string;
  currentPrice: number;
  minNextBid: number;
  bidCount: number;
  highestBidderMasked?: string;
  bid: {
    id: string;
    amount: number;
    amountMasked?: string;
    at: string;
    bidderMasked: string;
  };
  endsAt: string;
  serverTime: string;
}

export interface AuctionExtendedPayload {
  auctionId: string;
  endsAt: string;
  extensionCount: number;
  serverTime: string;
}

export interface AuctionEndingPayload {
  auctionId: string;
  endsAt: string;
  secondsLeft: number;
  serverTime: string;
}

export interface AuctionEndedPayload {
  auctionId: string;
  status: 'ended' | 'sold' | 'unsold' | 'cancelled';
  winnerMasked?: string;
  finalPrice?: number;
  serverTime: string;
}

export interface ViewerCountPayload {
  auctionId: string;
  count: number;
}

export interface OutbidNotificationPayload {
  auctionId: string;
  title: string;
  yourLastBid: number;
  currentPrice: number;
  minNextBid: number;
  serverTime: string;
}

export interface NotificationPayload {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface PaymentSuccessPayload {
  auctionId: string;
  paymentId: string;
  serverTime: string;
}

export interface FraudAlertPayload {
  rule: string;
  auctionId?: string;
  userId?: string;
  score: number;
  details: string;
  createdAt: string;
}

function emitToRoom(room: string, event: string, payload: unknown): void {
  if (registeredIO) {
    registeredIO.to(room).emit(event, payload);
  } else {
    try {
      getEmitter().to(room).emit(event, payload);
    } catch (err) {
      logger.error({ err, room, event }, 'Failed to emit socket event via emitter');
    }
  }
}

export function emitBidUpdated(payload: BidUpdatedPayload): void {
  emitToRoom(auctionRoom(payload.auctionId), 'bid-updated', payload);
}

export function emitAuctionExtended(payload: AuctionExtendedPayload): void {
  emitToRoom(auctionRoom(payload.auctionId), 'auction-extended', payload);
}

export function emitAuctionEnding(payload: AuctionEndingPayload): void {
  emitToRoom(auctionRoom(payload.auctionId), 'auction-ending', payload);
}

export function emitAuctionEnded(payload: AuctionEndedPayload): void {
  emitToRoom(auctionRoom(payload.auctionId), 'auction-ended', payload);
}

export function emitViewerCount(payload: ViewerCountPayload): void {
  emitToRoom(auctionRoom(payload.auctionId), 'viewer-count', payload);
}

export function emitOutbidNotification(userId: string, payload: OutbidNotificationPayload): void {
  emitToRoom(userRoom(userId), 'outbid-notification', payload);
}

export function emitNotification(userId: string, payload: NotificationPayload): void {
  emitToRoom(userRoom(userId), 'notification', payload);
}

export function emitPaymentSuccess(userId: string, payload: PaymentSuccessPayload): void {
  emitToRoom(userRoom(userId), 'payment-success', payload);
}

export function emitFraudAlert(payload: FraudAlertPayload): void {
  emitToRoom(ADMIN_ROOM, 'fraud-alert', payload);
}
