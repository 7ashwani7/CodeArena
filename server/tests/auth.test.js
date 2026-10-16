import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { RefreshToken } from '../src/models/RefreshToken.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../src/utils/token.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
});

describe('Authentication & Authorization Suite', () => {
  const testUser = {
    name: 'Ada Lovelace',
    username: 'adalovelace',
    email: 'ada@example.com',
    password: 'SuperSecret123!'
  };

  describe('POST /api/auth/register', () => {
    it('successfully registers a new user with secure password hash and HTTP-only cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('ada@example.com');
      expect(res.body.data.user.username).toBe('adalovelace');
      expect(res.body.data.user.role).toBe('user');
      // Crucial: passwordHash must never be exposed
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Check cookie headers
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes(AUTH_COOKIE_NAME))).toBe(true);
      expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);

      // Verify in database that password was hashed
      const userInDb = await User.findOne({ email: 'ada@example.com' }).select('+passwordHash');
      expect(userInDb).toBeDefined();
      expect(userInDb.passwordHash).not.toBe(testUser.password);
      expect(userInDb.passwordHash.startsWith('$2a$12$') || userInDb.passwordHash.startsWith('$2b$12$')).toBe(true);
    });

    it('rejects registration with an email that is already registered (409 Conflict)', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .set('X-Requested-With', 'XMLHttpRequest');

      // Duplicate registration attempt
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          username: 'different_user'
        })
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
    });

    it('rejects registration with a username that is already taken (409 Conflict)', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .set('X-Requested-With', 'XMLHttpRequest');

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'different@example.com'
        })
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_USERNAME');
    });

    it('rejects passwords shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          password: '123'
        })
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects malformed email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'not-an-email'
        })
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .set('X-Requested-With', 'XMLHttpRequest');
    });

    it('successfully logs in with valid email and password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.passwordHash).toBeUndefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies.some((c) => c.includes(AUTH_COOKIE_NAME))).toBe(true);
    });

    it('successfully logs in with valid username instead of email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.username,
          password: testUser.password
        })
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe(testUser.username);
    });

    it('returns generic error when password is incorrect without leaking email existence', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'IncorrectPassword999!'
        })
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('returns the same generic error when email does not exist', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unknown_user_999@example.com',
          password: 'SomePassword123!'
        })
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/me & Session Verification', () => {
    it('returns 401 Unauthorized when accessing /me without an auth cookie', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns current user profile when valid auth cookie is presented', async () => {
      // Register to get cookie
      const regRes = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .set('X-Requested-With', 'XMLHttpRequest');

      const cookie = regRes.headers['set-cookie'];

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.email).toBe(testUser.email);
      expect(meRes.body.data.user.username).toBe(testUser.username);
    });
  });

  describe('POST /api/auth/logout & Session Revocation', () => {
    it('revokes session in database and clears auth cookie', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .set('X-Requested-With', 'XMLHttpRequest');

      const cookie = regRes.headers['set-cookie'];

      // Logout request
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Verify that database session is marked as revoked
      const user = await User.findOne({ email: testUser.email });
      const sessions = await RefreshToken.find({ userId: user._id });
      expect(sessions.length).toBe(1);
      expect(sessions[0].isRevoked).toBe(true);

      // Subsequent attempt to use the previous cookie must fail with SESSION_REVOKED
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      expect(meRes.status).toBe(401);
      expect(meRes.body.error.code).toBe('SESSION_REVOKED');
    });
  });

  describe('Role-based Authorization & Admin Routes', () => {
    it('forbids regular user from accessing admin route (403 Forbidden)', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .set('X-Requested-With', 'XMLHttpRequest');

      const cookie = regRes.headers['set-cookie'];

      const adminRes = await request(app)
        .get('/api/auth/admin-check')
        .set('Cookie', cookie);

      expect(adminRes.status).toBe(403);
      expect(adminRes.body.success).toBe(false);
      expect(adminRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('allows admin user to access admin route', async () => {
      const adminPassHash = await User.hashPassword('Admin12345!');
      const adminUser = await User.create({
        name: 'Administrator',
        username: 'sysadmin',
        email: 'sysadmin@codearena.dev',
        passwordHash: adminPassHash,
        role: 'admin'
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sysadmin@codearena.dev',
          password: 'Admin12345!'
        })
        .set('X-Requested-With', 'XMLHttpRequest');

      const cookie = loginRes.headers['set-cookie'];

      const adminRes = await request(app)
        .get('/api/auth/admin-check')
        .set('Cookie', cookie);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.success).toBe(true);
      expect(adminRes.body.data.role).toBe('admin');
      expect(adminRes.body.data.adminUser).toBe('sysadmin');
    });
  });

  describe('CSRF Protection', () => {
    it('blocks state mutation when auth cookie is present without CSRF token or AJAX header', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .set('X-Requested-With', 'XMLHttpRequest');

      const cookies = regRes.headers['set-cookie'];
      // Filter only auth cookie, omit CSRF header / token
      const authCookie = cookies.find((c) => c.includes(AUTH_COOKIE_NAME));

      const attackRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', authCookie);

      expect(attackRes.status).toBe(403);
      expect(attackRes.body.error.code).toBe('CSRF_TOKEN_MISSING');
    });

    it('permits state mutation when matching X-CSRF-Token is supplied', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .set('X-Requested-With', 'XMLHttpRequest');

      const cookies = regRes.headers['set-cookie'];
      const csrfCookiePart = cookies.find((c) => c.includes(CSRF_COOKIE_NAME));
      const csrfToken = csrfCookiePart.split(';')[0].split('=')[1];

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
