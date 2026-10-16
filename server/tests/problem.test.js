import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Problem } from '../src/models/Problem.js';
import { ProblemProgress } from '../src/models/ProblemProgress.js';
import { Submission } from '../src/models/Submission.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { seedProblems } from '../src/scripts/seed.js';
import { createOrPromoteAdmin } from '../src/scripts/createAdmin.js';
import { signJwtToken, AUTH_COOKIE_NAME } from '../src/utils/token.js';


let mongod;

beforeAll(async () => {
  // Spin up an in-memory real MongoDB server for isolated integration testing
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  // Seed with standard test problem bank
  await seedProblems();
}, 60000); // 60s timeout for first-time binary startup

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

describe('Problems API Foundation', () => {
  describe('GET /api/problems — Listing & Pagination', () => {
    it('returns 200 with standard envelope and pagination metadata', async () => {
      const res = await request(app)
        .get('/api/problems')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('page', 1);
      expect(res.body.meta).toHaveProperty('limit', 10);
      expect(res.body.meta).toHaveProperty('totalItems', 17);
      expect(res.body.meta).toHaveProperty('totalPages', 2);
      expect(res.body.meta).toHaveProperty('hasNextPage', true);
      expect(res.body.meta).toHaveProperty('hasPrevPage', false);
    });

    it('respects page and limit parameters correctly', async () => {
      const res = await request(app)
        .get('/api/problems?page=2&limit=5')
        .expect(200);

      expect(res.body.meta.page).toBe(2);
      expect(res.body.meta.limit).toBe(5);
      expect(res.body.data.length).toBe(5);
    });

    it('clamps limit to maximum 50 when client requests excessive size', async () => {
      const res = await request(app)
        .get('/api/problems?limit=500')
        .expect(400); // Exceeds validator limit (1-50)

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid non-integer or negative page numbers', async () => {
      const res = await request(app)
        .get('/api/problems?page=-2')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Security & Projection Rules', () => {
    it('never exposes private judge test cases in list responses', async () => {
      const res = await request(app).get('/api/problems').expect(200);

      for (const problem of res.body.data) {
        expect(problem).not.toHaveProperty('judgeTestCases');
      }
    });

    it('never exposes private judge test cases in single problem response', async () => {
      const res = await request(app).get('/api/problems/two-sum').expect(200);

      expect(res.body.data).toHaveProperty('slug', 'two-sum');
      expect(res.body.data).not.toHaveProperty('judgeTestCases');
    });

    it('never returns unpublished draft problems to the public catalog', async () => {
      // Alien Dictionary Draft was seeded with publicationStatus: 'draft'
      const listRes = await request(app).get('/api/problems').expect(200);
      const slugs = listRes.body.data.map(p => p.slug);
      expect(slugs).not.toContain('alien-dictionary-draft');

      // Direct slug query to draft problem returns 404
      const singleRes = await request(app).get('/api/problems/alien-dictionary-draft').expect(404);
      expect(singleRes.body.success).toBe(false);
      expect(singleRes.body.error.code).toBe('PROBLEM_NOT_FOUND');
    });
  });

  describe('Filtering & Searching', () => {
    it('filters problems by difficulty', async () => {
      const res = await request(app).get('/api/problems?difficulty=Easy').expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      for (const p of res.body.data) {
        expect(p.difficulty).toBe('Easy');
      }
    });

    it('rejects invalid difficulty values with 400 Bad Request', async () => {
      const res = await request(app).get('/api/problems?difficulty=SuperHard').expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('filters problems by topic', async () => {
      const res = await request(app).get('/api/problems?topic=Dynamic%20Programming').expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      for (const p of res.body.data) {
        expect(p.topics).toContain('Dynamic Programming');
      }
    });

    it('searches problems by title keyword', async () => {
      const res = await request(app).get('/api/problems?search=reverse').expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].slug).toBe('reverse-linked-list');
    });
  });

  describe('GET /api/problems/:slug — Single Problem Retrieval', () => {
    it('returns 200 with full problem details for a valid slug', async () => {
      const res = await request(app).get('/api/problems/two-sum').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('title', 'Two Sum');
      expect(res.body.data).toHaveProperty('description');
      expect(res.body.data).toHaveProperty('examples');
      expect(res.body.data).toHaveProperty('constraints');
      expect(res.body.data).toHaveProperty('starterCode');
      expect(res.body.data.starterCode).toHaveProperty('javascript');
      expect(res.body.data.starterCode).toHaveProperty('python');
    });

    it('returns 404 for non-existent slug', async () => {
      const res = await request(app).get('/api/problems/non-existent-problem').expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PROBLEM_NOT_FOUND');
    });

    it('returns 400 for malformed slug with invalid characters', async () => {
      const res = await request(app).get('/api/problems/INVALID_SLUG!@#').expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('User Solved Status Annotation', () => {
    it('marks problems as Solved for authenticated users with recorded progress', async () => {
      // Create user and progress record for Two Sum
      const user = await User.create({
        username: 'coder_test',
        email: 'coder_test@example.com',
        passwordHash: 'dummy_hash',
        role: 'user'
      });

      const twoSum = await Problem.findOne({ slug: 'two-sum' });
      await ProblemProgress.create({
        userId: user._id,
        problemId: twoSum._id,
        status: 'Solved',
        solvedAt: new Date()
      });

      const token = signJwtToken({ sub: user._id.toString(), role: 'user' });

      const res = await request(app)
        .get('/api/problems?limit=20')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${token}`])
        .expect(200);

      const twoSumItem = res.body.data.find((p) => p.slug === 'two-sum');

      expect(twoSumItem).toBeDefined();
      expect(twoSumItem.status).toBe('Solved');

      const otherItem = res.body.data.find((p) => p.slug !== 'two-sum');
      expect(otherItem.status).toBe('Unsolved');
    });

    it('defaults status to Unsolved for unauthenticated visitors', async () => {
      const res = await request(app).get('/api/problems').expect(200);
      expect(res.body.data.every((p) => p.status === 'Unsolved')).toBe(true);
    });
  });

  describe('Admin Problem Management', () => {
    let adminToken;
    let userToken;

    beforeAll(async () => {
      const admin = await User.create({
        username: 'prob_admin',
        email: 'prob_admin@example.com',
        passwordHash: 'hash',
        role: 'admin'
      });
      adminToken = signJwtToken({ sub: admin._id.toString(), role: 'admin' });

      const regular = await User.create({
        username: 'regular_dev',
        email: 'regular_dev@example.com',
        passwordHash: 'hash',
        role: 'user'
      });
      userToken = signJwtToken({ sub: regular._id.toString(), role: 'user' });
    });

    it('forbids non-admin users from creating problems (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/problems')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          title: 'Unauthorized Problem',
          slug: 'unauthorized-prob',
          difficulty: 'Easy',
          description: 'Test description'
        })
        .expect(403);

      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('allows admin to create a new problem', async () => {
      const newProblem = {
        title: 'Merge Two Sorted Lists',
        slug: 'merge-two-sorted-lists',
        difficulty: 'Easy',
        topics: ['Linked Lists'],
        description: 'Merge two sorted linked lists and return it as a new sorted list.',
        constraints: ['The number of nodes in both lists is in the range [0, 50].'],
        examples: [{ input: 'l1 = [1,2,4], l2 = [1,3,4]', output: '[1,1,2,3,4,4]', explanation: 'Merged sorted list.' }],
        starterCode: {
          javascript: 'function mergeTwoLists(l1, l2) {}',
          python: 'def mergeTwoLists(self, l1, l2):'
        },
        publicationStatus: 'draft'
      };

      const res = await request(app)
        .post('/api/problems')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .set('X-Requested-With', 'XMLHttpRequest')
        .send(newProblem)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('merge-two-sorted-lists');
      expect(res.body.data.publicationStatus).toBe('draft');
    });

    it('allows admin to publish a draft problem', async () => {
      const problem = await Problem.findOne({ slug: 'merge-two-sorted-lists' });

      const res = await request(app)
        .patch(`/api/problems/${problem._id}/publication`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ publicationStatus: 'published' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.publicationStatus).toBe('published');

      // Now visible in public listing
      const publicRes = await request(app).get('/api/problems?search=Merge').expect(200);
      expect(publicRes.body.data.some((p) => p.slug === 'merge-two-sorted-lists')).toBe(true);
    });

    it('allows admin to update problem details', async () => {
      const problem = await Problem.findOne({ slug: 'merge-two-sorted-lists' });

      const res = await request(app)
        .put(`/api/problems/${problem._id}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          title: 'Merge Two Sorted Lists Updated',
          slug: 'merge-two-sorted-lists',
          difficulty: 'Medium',
          description: 'Updated problem description'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.difficulty).toBe('Medium');
      expect(res.body.data.title).toBe('Merge Two Sorted Lists Updated');
    });

    it('allows admin to fetch all problems including drafts for management', async () => {
      const res = await request(app)
        .get('/api/problems/admin/all')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((p) => p.slug === 'alien-dictionary-draft')).toBe(true);
    });

    it('allows admin to delete a problem with no submissions', async () => {
      const problem = await Problem.findOne({ slug: 'merge-two-sorted-lists' });

      const res = await request(app)
        .delete(`/api/problems/${problem._id}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .set('X-Requested-With', 'XMLHttpRequest')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);

      const check = await Problem.findById(problem._id);
      expect(check).toBeNull();
    });

    it('allows admin to fetch a single problem with judge test cases via GET /api/problems/admin/:id', async () => {
      const twoSum = await Problem.findOne({ slug: 'two-sum' });

      const res = await request(app)
        .get(`/api/problems/admin/${twoSum._id}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('two-sum');
      expect(Array.isArray(res.body.data.judgeTestCases)).toBe(true);
      expect(res.body.data.judgeTestCases.length).toBeGreaterThan(0);
      expect(res.body.data.judgeTestCases[0]).toHaveProperty('input');
      expect(res.body.data.judgeTestCases[0]).toHaveProperty('expectedOutput');
    });

    it('forbids normal user or unauthenticated client from accessing GET /api/problems/admin/:id', async () => {
      const twoSum = await Problem.findOne({ slug: 'two-sum' });

      // Unauthenticated -> 401
      await request(app)
        .get(`/api/problems/admin/${twoSum._id}`)
        .expect(401);

      // Normal authenticated user -> 403
      const regularRes = await request(app)
        .get(`/api/problems/admin/${twoSum._id}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(403);

      expect(regularRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('prevents deleting a problem with submission history unless force=true', async () => {
      const targetProb = await Problem.findOne({ slug: 'two-sum' });

      // Create a submission record referencing two-sum
      await Submission.create({
        userId: new mongoose.Types.ObjectId(),
        problemId: targetProb._id,
        language: 'javascript',
        sourceCode: 'function twoSum() {}',
        status: 'Accepted'
      });

      // Attempt deletion without force -> 409 Conflict
      const rejectRes = await request(app)
        .delete(`/api/problems/${targetProb._id}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .set('X-Requested-With', 'XMLHttpRequest')
        .expect(409);

      expect(rejectRes.body.success).toBe(false);
      expect(rejectRes.body.error.code).toBe('PROBLEM_HAS_SUBMISSIONS');
      expect(rejectRes.body.error.message).toContain('submission record(s)');

      // Problem must still exist in DB
      const stillExists = await Problem.findById(targetProb._id);
      expect(stillExists).not.toBeNull();
    });

    it('allows deleting a problem with submissions when force=true is explicitly confirmed', async () => {
      const targetProb = await Problem.findOne({ slug: 'two-sum' });

      const res = await request(app)
        .delete(`/api/problems/${targetProb._id}?force=true`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .set('X-Requested-With', 'XMLHttpRequest')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);
      expect(res.body.data.submissionsDeleted).toBeGreaterThanOrEqual(1);

      const check = await Problem.findById(targetProb._id);
      expect(check).toBeNull();
    });

    it('creates audit log entries and allows admin to retrieve them via GET /api/problems/admin/audit-logs', async () => {
      const res = await request(app)
        .get('/api/problems/admin/audit-logs?page=1&limit=20')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('totalItems');

      const actions = res.body.data.map((l) => l.action);
      expect(actions).toContain('DELETE_PROBLEM');
    });

    it('forbids non-admin users from accessing administrative audit logs', async () => {
      await request(app)
        .get('/api/problems/admin/audit-logs')
        .expect(401);

      await request(app)
        .get('/api/problems/admin/audit-logs')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${userToken}`])
        .expect(403);
    });

    it('validates administrative problem payloads and rejects malformed inputs', async () => {
      // Missing title
      await request(app)
        .post('/api/problems')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ slug: 'valid-slug', difficulty: 'Easy', description: 'desc' })
        .expect(400);

      // Invalid difficulty
      await request(app)
        .post('/api/problems')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ title: 'Test', slug: 'valid-slug', difficulty: 'Extreme', description: 'desc' })
        .expect(400);

      // Malformed slug
      await request(app)
        .post('/api/problems')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ title: 'Test', slug: 'INVALID SLUG WITH SPACES', difficulty: 'Easy', description: 'desc' })
        .expect(400);
    });

    it('provisions administrator accounts securely without hardcoding credentials', async () => {
      const result = await createOrPromoteAdmin({
        email: 'newadmin@codearena.dev',
        username: 'super_admin_test',
        password: 'SecureAdminPassword123!',
        name: 'Super Admin Test'
      });

      expect(result.action).toBe('created');
      expect(result.user.role).toBe('admin');
      expect(result.user.email).toBe('newadmin@codearena.dev');
      expect(result.user).not.toHaveProperty('passwordHash');

      // Create an existing regular user first
      await User.create({
        name: 'Alex Chen',
        username: 'alex_coder',
        email: 'alex@codearena.dev',
        passwordHash: 'dummyhash',
        role: 'user'
      });

      // Promoting existing user
      const promoteResult = await createOrPromoteAdmin({
        email: 'alex@codearena.dev',
        username: 'alex_coder'
      });

      expect(promoteResult.action).toBe('promoted');
      expect(promoteResult.user.role).toBe('admin');
    });
  });
});


