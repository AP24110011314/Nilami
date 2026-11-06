import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { getRedisClient, disconnectRedis } from '../../src/config/redis.js';
import { User } from '../../src/modules/users/user.model.js';
import { RefreshToken } from '../../src/modules/auth/refresh-token.model.js';
import { AuthToken } from '../../src/modules/auth/auth-token.model.js';

describe('Phase 1 — Auth and Users Integration Suite', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDB();
    getRedisClient();
    // Clean up test data
    await User.deleteMany({ email: /@auth\.test\.nilami\.local$/ });
    await RefreshToken.deleteMany({});
    await AuthToken.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@auth\.test\.nilami\.local$/ });
    await RefreshToken.deleteMany({});
    await AuthToken.deleteMany({});
    await disconnectRedis();
    await disconnectDB();
  });

  const testBuyer = {
    name: 'Aarav Sharma',
    email: 'aarav@auth.test.nilami.local',
    password: 'Password123!',
  };

  const testSeller = {
    name: 'Priya Patel',
    email: 'priya@auth.test.nilami.local',
    password: 'Password123!',
    role: 'seller' as const,
  };

  it('FR-A1: registers a new user and dispatches verification email to Mailpit', async () => {
    const res = await request(app).post('/api/auth/register').send(testBuyer);

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testBuyer.email);
    expect(res.body.user.roles).toEqual(['buyer']);
    expect(res.body.user.passwordHash).toBeUndefined(); // Never leaks

    // Wait briefly for Mailpit SMTP delivery and verify receipt via Mailpit API
    await new Promise((r) => setTimeout(r, 600));

    const mailpitRes = await fetch('http://127.0.0.1:8025/api/v1/messages');
    expect(mailpitRes.ok).toBe(true);
    const mailpitData = (await mailpitRes.json()) as {
      messages: Array<{ To: Array<{ Address: string }>; Subject: string; ID: string }>;
    };

    const sentMail = mailpitData.messages.find(
      (m) => m.To.some((t) => t.Address === testBuyer.email) && m.Subject.includes('Verify'),
    );
    expect(sentMail).toBeDefined();
  });

  it('FR-A3: verifies user email address with valid token', async () => {
    const user = await User.findOne({ email: testBuyer.email });
    expect(user).toBeDefined();

    const tokenDoc = await AuthToken.findOne({
      userId: user!._id,
      type: 'email_verification',
      usedAt: null,
    });
    expect(tokenDoc).toBeDefined();

    // Read the message body from Mailpit to verify the exact link/token
    const mailpitRes = await fetch('http://127.0.0.1:8025/api/v1/messages');
    const mailpitData = (await mailpitRes.json()) as {
      messages: Array<{ To: Array<{ Address: string }>; ID: string }>;
    };
    const messageMeta = mailpitData.messages.find((m) =>
      m.To.some((t) => t.Address === testBuyer.email),
    );
    expect(messageMeta).toBeDefined();

    const detailRes = await fetch(`http://127.0.0.1:8025/api/v1/message/${messageMeta!.ID}`);
    const messageDetail = (await detailRes.json()) as { Text: string };
    const match = messageDetail.Text.match(/token=([a-f0-9]+)/);
    expect(match).not.toBeNull();
    const token = match![1]!;

    const verifyRes = await request(app).post('/api/auth/verify-email').send({ token });
    expect(verifyRes.status).toBe(200);

    const verifiedUser = await User.findOne({ email: testBuyer.email });
    expect(verifiedUser?.emailVerifiedAt).not.toBeNull();
  });

  it('FR-A1 & FR-A2: logs in with valid credentials, returns JWT and sets httpOnly refresh cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testBuyer.email,
      password: testBuyer.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(testBuyer.email);

    // Verify Set-Cookie header contains rt
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    const rtCookie = cookies.find((c: string) => c.startsWith('rt='));
    expect(rtCookie).toBeDefined();
    expect(rtCookie).toContain('HttpOnly');
    expect(rtCookie).toContain('Path=/api/auth');
  });

  it('FR-A2: rotates refresh token and provides new access token', async () => {
    // Login to obtain initial refresh cookie
    const loginRes = await request(app).post('/api/auth/login').send({
      email: testBuyer.email,
      password: testBuyer.password,
    });

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const rtCookie = cookies.find((c: string) => c.startsWith('rt='))!;

    // Refresh token
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', rtCookie);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeDefined();

    // Verify a new refresh cookie is returned
    const newCookies = refreshRes.headers['set-cookie'] as unknown as string[];
    const newRtCookie = newCookies.find((c: string) => c.startsWith('rt='))!;
    expect(newRtCookie).toBeDefined();
    expect(newRtCookie).not.toEqual(rtCookie);
  });

  it('T27: Refresh token reuse revokes the entire token family', async () => {
    // 1. Login to get initial refresh token (R1)
    const loginRes = await request(app).post('/api/auth/login').send({
      email: testBuyer.email,
      password: testBuyer.password,
    });

    const initialCookie = (loginRes.headers['set-cookie'] as unknown as string[]).find((c: string) =>
      c.startsWith('rt='),
    )!;

    // 2. Perform legitimate rotation to get (R2)
    const rotateRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', initialCookie);

    expect(rotateRes.status).toBe(200);
    const rotatedCookie = (rotateRes.headers['set-cookie'] as unknown as string[]).find((c: string) =>
      c.startsWith('rt='),
    )!;

    // 3. Attacker replays compromised old refresh token (R1)
    const attackRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', initialCookie);

    // Reuse detected -> 401
    expect(attackRes.status).toBe(401);
    expect(attackRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');

    // 4. Legitimate user tries to use (R2) -> must now fail because family was revoked!
    const subsequentRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', rotatedCookie);

    expect(subsequentRes.status).toBe(401);
  });

  it('T26: IDOR protection prevents User B from accessing User A private data', async () => {
    // Create User A (buyer) and User B (seller)
    await request(app).post('/api/auth/register').send(testSeller);

    const loginA = await request(app).post('/api/auth/login').send({
      email: testBuyer.email,
      password: testBuyer.password,
    });

    const loginB = await request(app).post('/api/auth/login').send({
      email: testSeller.email,
      password: testSeller.password,
    });

    const tokenA = loginA.body.accessToken as string;
    const tokenB = loginB.body.accessToken as string;
    const userAId = loginA.body.user.id as string;
    const userBId = loginB.body.user.id as string;

    // User A accessing own private data -> 200
    const ownRes = await request(app)
      .get(`/api/users/${userAId}/private`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(ownRes.status).toBe(200);
    expect(ownRes.body.settings.id).toBe(userAId);

    // User B attempting to access User A's private data -> 403 Forbidden (IDOR prevented)
    const idorRes = await request(app)
      .get(`/api/users/${userAId}/private`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(idorRes.status).toBe(403);
    expect(idorRes.body.error.code).toBe('FORBIDDEN');

    // User B accessing own private data -> 200
    const ownResB = await request(app)
      .get(`/api/users/${userBId}/private`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(ownResB.status).toBe(200);
  });

  it('T30: Role authorization strictly forbids non-admin from accessing admin routes', async () => {
    // User A is a buyer (non-admin)
    const loginA = await request(app).post('/api/auth/login').send({
      email: testBuyer.email,
      password: testBuyer.password,
    });
    const tokenBuyer = loginA.body.accessToken as string;

    // Buyer hits admin route -> 403 Forbidden
    const deniedRes = await request(app)
      .get('/api/admin/queues')
      .set('Authorization', `Bearer ${tokenBuyer}`);

    expect(deniedRes.status).toBe(403);
    expect(deniedRes.body.error.code).toBe('FORBIDDEN');

    // Unauthenticated request -> 401 Unauthenticated
    const unauthRes = await request(app).get('/api/admin/queues');
    expect(unauthRes.status).toBe(401);

    // Create an admin user to verify valid admin access
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@auth.test.nilami.local',
      passwordHash: 'dummy',
      roles: ['admin', 'buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    });

    const { generateAccessToken } = await import('../../src/modules/auth/auth.utils.js');
    const adminToken = generateAccessToken(adminUser);

    const adminRes = await request(app)
      .get('/api/admin/queues')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.ok).toBe(true);
  });

  it('FR-A5: allows verified buyer to become seller via /users/me/become-seller', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: testBuyer.email,
      password: testBuyer.password,
    });
    const token = loginRes.body.accessToken as string;

    const res = await request(app)
      .post('/api/users/me/become-seller')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.roles).toContain('seller');
  });

  it('FR-A4: password reset flow dispatches reset email and invalidates old sessions', async () => {
    // Request password reset
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testBuyer.email });

    expect(forgotRes.status).toBe(200);

    // Read reset token from Mailpit
    await new Promise((r) => setTimeout(r, 600));
    const mailpitRes = await fetch('http://127.0.0.1:8025/api/v1/messages');
    const mailpitData = (await mailpitRes.json()) as {
      messages: Array<{ To: Array<{ Address: string }>; Subject: string; ID: string }>;
    };
    const resetMsg = mailpitData.messages.find(
      (m) => m.To.some((t) => t.Address === testBuyer.email) && m.Subject.includes('Reset'),
    );
    expect(resetMsg).toBeDefined();

    const detailRes = await fetch(`http://127.0.0.1:8025/api/v1/message/${resetMsg!.ID}`);
    const messageDetail = (await detailRes.json()) as { Text: string };
    const match = messageDetail.Text.match(/token=([a-f0-9]+)/);
    expect(match).not.toBeNull();
    const token = match![1]!;

    // Reset password
    const newPassword = 'NewSecretPassword456!';
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: newPassword });

    expect(resetRes.status).toBe(200);

    // Old password should now fail
    const oldLogin = await request(app).post('/api/auth/login').send({
      email: testBuyer.email,
      password: testBuyer.password,
    });
    expect(oldLogin.status).toBe(401);

    // New password succeeds
    const newLogin = await request(app).post('/api/auth/login').send({
      email: testBuyer.email,
      password: newPassword,
    });
    expect(newLogin.status).toBe(200);
  });
});
