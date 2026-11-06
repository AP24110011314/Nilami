import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { getRedisClient } from '../config/redis.js';
import { auctionRoom, userRoom, ADMIN_ROOM } from './rooms.js';
import { registerIO, maskName } from './events.js';
import { Auction } from '../modules/auctions/auction.model.js';
import { Bid } from '../modules/bids/bid.model.js';
import { sanitizeAuction } from '../modules/auctions/auction.service.js';

let io: Server | null = null;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

export interface SocketData {
  userId: string | null;
  email?: string;
  roles: string[];
}

export function initSocketServer(httpServer: HttpServer): Server {
  if (io) return io;

  const redis = getRedisClient();
  pubClient = redis.duplicate();
  subClient = redis.duplicate();

  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.adapter(createAdapter(pubClient, subClient));
  registerIO(io);

  // Handshake authentication
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== 'string') {
      socket.data = { userId: null, roles: [] } as SocketData;
      return next();
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
        sub: string;
        email?: string;
        roles?: string[];
      };
      socket.data = {
        userId: decoded.sub,
        email: decoded.email,
        roles: decoded.roles || [],
      } as SocketData;
      return next();
    } catch {
      // Invalid/expired token falls back to anonymous read-only
      socket.data = { userId: null, roles: [] } as SocketData;
      return next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;
    logger.debug({ socketId: socket.id, userId: data?.userId }, 'Socket connected');

    // Join user-specific room if authenticated
    if (data?.userId) {
      void socket.join(userRoom(data.userId));
      if (data.roles?.includes('admin')) {
        void socket.join(ADMIN_ROOM);
      }
    }

    // Refresh auth on active connection
    socket.on('auth-refresh', (payload: { token: string }, callback?: (res: { ok: boolean; error?: string }) => void) => {
      try {
        if (!payload?.token) {
          if (typeof callback === 'function') callback({ ok: false, error: 'Token required' });
          return;
        }

        const decoded = jwt.verify(payload.token, env.JWT_ACCESS_SECRET) as {
          sub: string;
          email?: string;
          roles?: string[];
        };

        const oldData = socket.data as SocketData;
        if (oldData?.userId) {
          void socket.leave(userRoom(oldData.userId));
        }

        socket.data = {
          userId: decoded.sub,
          email: decoded.email,
          roles: decoded.roles || [],
        } as SocketData;

        void socket.join(userRoom(decoded.sub));
        if (decoded.roles?.includes('admin')) {
          void socket.join(ADMIN_ROOM);
        }

        if (typeof callback === 'function') callback({ ok: true });
      } catch {
        if (typeof callback === 'function') callback({ ok: false, error: 'Invalid token' });
      }
    });

    // Join an auction room and return snapshot
    socket.on('join-auction', async (payload: { auctionId: string }, callback?: (res: unknown) => void) => {
      try {
        const { auctionId } = payload || {};
        if (!auctionId) {
          if (typeof callback === 'function') callback({ ok: false, error: 'auctionId required' });
          return;
        }

        const room = auctionRoom(auctionId);
        await socket.join(room);

        // Fetch current auction
        const auction = await Auction.findById(auctionId).populate('sellerId', 'name ratingAvg ratingCount');
        if (!auction) {
          if (typeof callback === 'function') callback({ ok: false, error: 'Auction not found' });
          return;
        }

        // Fetch recent bids (last 20) with masked bidder names
        const bids = await Bid.find({ auctionId })
          .sort({ createdAt: -1 })
          .limit(20)
          .populate('bidderId', 'name')
          .lean();

        const formattedBids = bids.map((b) => ({
          id: b._id.toString(),
          amount: b.amount,
          bidderMasked: maskName((b.bidderId as unknown as { name?: string })?.name),
          createdAt: b.createdAt.toISOString(),
        }));

        let viewerCount = 1;
        try {
          const socketsInRoom = await io?.in(room).fetchSockets();
          viewerCount = socketsInRoom ? socketsInRoom.length : 1;
        } catch {
          // fallback to 1
        }

        // Broadcast viewer count update to the auction room
        io?.to(room).emit('viewer-count', { auctionId, count: viewerCount });

        const sanitized = sanitizeAuction(auction);

        if (typeof callback === 'function') {
          callback({
            ok: true,
            snapshot: {
              auction: {
                id: sanitized.id,
                title: sanitized.title,
                currentPrice: sanitized.currentPrice,
                minNextBid: sanitized.minNextBid,
                bidCount: sanitized.bidCount,
                endsAt: sanitized.endsAt.toISOString(),
                status: sanitized.status,
                reserveMet: sanitized.reserveMet,
                extensionCount: sanitized.extensionCount,
              },
              bids: formattedBids,
              viewerCount,
            },
            serverTime: new Date().toISOString(),
          });
        }
      } catch (err) {
        logger.error({ err, payload }, 'Error handling join-auction');
        if (typeof callback === 'function') callback({ ok: false, error: 'Failed to join auction' });
      }
    });

    // Leave an auction room
    socket.on('leave-auction', async (payload: { auctionId: string }, callback?: (res: { ok: boolean }) => void) => {
      try {
        const { auctionId } = payload || {};
        if (auctionId) {
          const room = auctionRoom(auctionId);
          await socket.leave(room);

          try {
            const socketsInRoom = await io?.in(room).fetchSockets();
            const count = socketsInRoom ? socketsInRoom.length : 0;
            io?.to(room).emit('viewer-count', { auctionId, count });
          } catch {
            // ignore
          }
        }
        if (typeof callback === 'function') callback({ ok: true });
      } catch (err) {
        logger.error({ err, payload }, 'Error handling leave-auction');
        if (typeof callback === 'function') callback({ ok: true });
      }
    });

    // Time-sync endpoint for clock offset calculation
    socket.on('time-sync', (_payload: unknown, callback?: (res: { serverTime: string }) => void) => {
      if (typeof callback === 'function') {
        callback({ serverTime: new Date().toISOString() });
      }
    });

    // Disconnecting: recalculate viewer count for any auction rooms
    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('auction:')) {
          const auctionId = room.slice('auction:'.length);
          setTimeout(async () => {
            try {
              if (io) {
                const sockets = await io.in(room).fetchSockets();
                io.to(room).emit('viewer-count', { auctionId, count: sockets.length });
              }
            } catch {
              // ignore during server shutdown
            }
          }, 50);
        }
      }
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

export async function closeSocketServer(): Promise<void> {
  if (io) {
    registerIO(null);
    await new Promise<void>((resolve) => {
      io?.close(() => {
        resolve();
      });
    });
    io = null;
  }

  if (pubClient) {
    await pubClient.quit();
    pubClient = null;
  }

  if (subClient) {
    await subClient.quit();
    subClient = null;
  }
}
