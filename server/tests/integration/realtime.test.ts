import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import crypto from 'node:crypto';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { getRedisClient, disconnectRedis } from '../../src/config/redis.js';
import { initSocketServer, closeSocketServer } from '../../src/realtime/socket.js';
import { getEmitter } from '../../src/realtime/emitter.js';
import { auctionRoom } from '../../src/realtime/rooms.js';
import { User, type UserDocument } from '../../src/modules/users/user.model.js';
import { Auction, type AuctionDocument } from '../../src/modules/auctions/auction.model.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';

describe('Phase 4 — Realtime Socket.IO Suite (T22–T25)', () => {
  let app: ReturnType<typeof createApp>;
  let httpServer: http.Server;
  let serverPort: number;
  let serverUrl: string;

  let seller: UserDocument;
  let buyer1: UserDocument;
  let buyer1Token: string;
  let buyer2: UserDocument;
  let buyer2Token: string;
  let buyer3: UserDocument;
  let buyer3Token: string;

  const openSockets: ClientSocket[] = [];

  function createClient(token?: string): ClientSocket {
    const socket = ioClient(serverUrl, {
      auth: token ? { token } : undefined,
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    openSockets.push(socket);
    return socket;
  }

  beforeAll(async () => {
    await connectDB();
    getRedisClient();

    app = createApp();
    httpServer = http.createServer(app);
    initSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address() as AddressInfo;
        serverPort = addr.port;
        serverUrl = `http://127.0.0.1:${serverPort}`;
        resolve();
      });
    });

    seller = (await User.create({
      name: 'Realtime Seller',
      email: `seller_${crypto.randomUUID()}@realtime.test.nilami.local`,
      passwordHash: 'dummy',
      roles: ['seller', 'buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as UserDocument;

    buyer1 = (await User.create({
      name: 'Aditi Sharma',
      email: `buyer1_${crypto.randomUUID()}@realtime.test.nilami.local`,
      passwordHash: 'dummy',
      roles: ['buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as UserDocument;
    buyer1Token = generateAccessToken(buyer1);

    buyer2 = (await User.create({
      name: 'Bob Builder',
      email: `buyer2_${crypto.randomUUID()}@realtime.test.nilami.local`,
      passwordHash: 'dummy',
      roles: ['buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as UserDocument;
    buyer2Token = generateAccessToken(buyer2);

    buyer3 = (await User.create({
      name: 'Charlie Root',
      email: `buyer3_${crypto.randomUUID()}@realtime.test.nilami.local`,
      passwordHash: 'dummy',
      roles: ['buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as UserDocument;
    buyer3Token = generateAccessToken(buyer3);
  });

  afterAll(async () => {
    for (const s of openSockets) {
      if (s.connected) s.disconnect();
    }

    await closeSocketServer();

    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });

    await User.deleteMany({ email: /@realtime\.test\.nilami\.local$/ });
    await disconnectRedis();
    await disconnectDB();
  });

  async function createTestAuction(overrides: Partial<AuctionDocument> = {}): Promise<AuctionDocument> {
    const now = new Date();
    const startsAt = new Date(now.getTime() - 60000);
    const endsAt = new Date(now.getTime() + 3600000);

    return (await Auction.create({
      sellerId: seller._id,
      title: 'Realtime Vintage Watch',
      description: 'Exclusive watch for realtime tests',
      category: 'electronics',
      condition: 'used_good',
      images: [{ url: 'https://example.com/watch.webp' }],
      currency: 'INR',
      startingPrice: 100000, // ₹1,000
      minIncrement: 10000, // ₹100
      currentPrice: 100000,
      minNextBid: 100000,
      startsAt,
      endsAt,
      originalEndsAt: endsAt,
      status: 'active',
      antiSnipe: {
        enabled: true,
        windowMs: 10000,
        extendMs: 30000,
        maxExtensions: 20,
      },
      ...overrides,
    })) as AuctionDocument;
  }

  it('T22: two clients in room receive bid-updated, non-joined client does not', async () => {
    const auction = await createTestAuction();
    const auctionId = auction._id.toString();

    const client1 = createClient(buyer1Token);
    const client2 = createClient(buyer2Token);
    const client3 = createClient(buyer3Token); // will not join room

    // Wait for connects
    await Promise.all([
      new Promise<void>((res) => client1.on('connect', res)),
      new Promise<void>((res) => client2.on('connect', res)),
      new Promise<void>((res) => client3.on('connect', res)),
    ]);

    // Join room for client1 and client2
    const join1 = await new Promise<{ ok: boolean; snapshot: unknown }>((res) =>
      client1.emit('join-auction', { auctionId }, res),
    );
    const join2 = await new Promise<{ ok: boolean; snapshot: unknown }>((res) =>
      client2.emit('join-auction', { auctionId }, res),
    );

    expect(join1.ok).toBe(true);
    expect(join2.ok).toBe(true);

    // Prepare listeners for bid-updated
    const client1Promise = new Promise<{
      currentPrice: number;
      bidCount: number;
      bidderMasked?: string;
    }>((res) => {
      client1.once('bid-updated', (payload) => res(payload));
    });

    const client2Promise = new Promise<{
      currentPrice: number;
      bidCount: number;
    }>((res) => {
      client2.once('bid-updated', (payload) => res(payload));
    });

    let client3Received = false;
    client3.on('bid-updated', () => {
      client3Received = true;
    });

    // Fire REST bid from buyer1 for ₹1,500 (150000 paise)
    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bid`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ amount: 150000, idempotencyKey: crypto.randomUUID() });

    expect(res.status).toBe(201);

    const [event1, event2] = await Promise.all([client1Promise, client2Promise]);

    expect(event1.currentPrice).toBe(150000);
    expect(event1.bidCount).toBe(1);
    expect(event2.currentPrice).toBe(150000);
    expect(event2.bidCount).toBe(1);

    // Wait 100ms to ensure client 3 received nothing
    await new Promise((r) => setTimeout(r, 100));
    expect(client3Received).toBe(false);
  });

  it('T23: previous leader gets outbid-notification, new bidder does not', async () => {
    const auction = await createTestAuction({
      currentPrice: 150000,
      minNextBid: 160000,
      highestBidderId: buyer1._id,
      bidCount: 1,
    });
    const auctionId = auction._id.toString();

    const client1 = createClient(buyer1Token); // Previous leader
    const client2 = createClient(buyer2Token); // New bidder

    await Promise.all([
      new Promise<void>((res) => client1.on('connect', res)),
      new Promise<void>((res) => client2.on('connect', res)),
    ]);

    // Listener for outbid-notification on buyer 1
    const outbidPromise = new Promise<{
      auctionId: string;
      title: string;
      yourLastBid: number;
      currentPrice: number;
      minNextBid: number;
    }>((res) => {
      client1.once('outbid-notification', (payload) => res(payload));
    });

    let buyer2GotOutbid = false;
    client2.on('outbid-notification', () => {
      buyer2GotOutbid = true;
    });

    // Buyer 2 places a higher bid (₹2,000 = 200000 paise)
    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bid`)
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({ amount: 200000, idempotencyKey: crypto.randomUUID() });

    expect(res.status).toBe(201);

    const outbidPayload = await outbidPromise;
    expect(outbidPayload.auctionId).toBe(auctionId);
    expect(outbidPayload.title).toBe(auction.title);
    expect(outbidPayload.currentPrice).toBe(200000);
    expect(outbidPayload.yourLastBid).toBe(150000);

    await new Promise((r) => setTimeout(r, 100));
    expect(buyer2GotOutbid).toBe(false);
  });

  it('T24: disconnect during bidding and reconnect returns current snapshot', async () => {
    const auction = await createTestAuction();
    const auctionId = auction._id.toString();

    // Client connects and joins
    const client = createClient(buyer1Token);
    await new Promise<void>((res) => client.on('connect', res));
    await new Promise((res) => client.emit('join-auction', { auctionId }, res));

    // Client disconnects
    client.disconnect();

    // Another buyer bids while client is offline
    await request(app)
      .post(`/api/auctions/${auctionId}/bid`)
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({ amount: 150000, idempotencyKey: crypto.randomUUID() });

    await request(app)
      .post(`/api/auctions/${auctionId}/bid`)
      .set('Authorization', `Bearer ${buyer3Token}`)
      .send({ amount: 200000, idempotencyKey: crypto.randomUUID() });

    // Client reconnects
    client.connect();
    await new Promise<void>((res) => client.on('connect', res));

    // Re-join auction and inspect snapshot
    const joinResult = await new Promise<{
      ok: boolean;
      snapshot: {
        auction: {
          currentPrice: number;
          bidCount: number;
          status: string;
        };
        bids: Array<{ amount: number; bidderMasked: string }>;
      };
      serverTime: string;
    }>((res) => client.emit('join-auction', { auctionId }, res));

    expect(joinResult.ok).toBe(true);
    expect(joinResult.snapshot.auction.currentPrice).toBe(200000);
    expect(joinResult.snapshot.auction.bidCount).toBe(2);
    expect(joinResult.snapshot.bids.length).toBe(2);
    expect(joinResult.serverTime).toBeDefined();
  });

  it('T25 preview: worker-emitted event reaches connected socket client via Redis emitter', async () => {
    const auction = await createTestAuction();
    const auctionId = auction._id.toString();

    const client = createClient(buyer1Token);
    await new Promise<void>((res) => client.on('connect', res));
    await new Promise((res) => client.emit('join-auction', { auctionId }, res));

    const endedPromise = new Promise<{
      auctionId: string;
      status: string;
      winnerMasked?: string;
    }>((res) => {
      client.once('auction-ended', (payload) => res(payload));
    });

    // Emit event directly using Redis emitter as a worker would
    const emitter = getEmitter();
    emitter.to(auctionRoom(auctionId)).emit('auction-ended', {
      auctionId,
      status: 'sold',
      winnerMasked: 'A***a',
      finalPrice: 150000,
      serverTime: new Date().toISOString(),
    });

    const received = await endedPromise;
    expect(received.auctionId).toBe(auctionId);
    expect(received.status).toBe('sold');
    expect(received.winnerMasked).toBe('A***a');
  });

  it('time-sync responds with valid server ISO timestamp', async () => {
    const client = createClient();
    await new Promise<void>((res) => client.on('connect', res));

    const res = await new Promise<{ serverTime: string }>((resolve) => {
      client.emit('time-sync', null, resolve);
    });

    expect(res.serverTime).toBeDefined();
    const parsed = new Date(res.serverTime);
    expect(parsed.getTime()).toBeGreaterThan(0);
    expect(Math.abs(Date.now() - parsed.getTime())).toBeLessThan(5000);
  });
});
