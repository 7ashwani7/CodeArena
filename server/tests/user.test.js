import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Problem } from '../src/models/Problem.js';
import { ProblemProgress } from '../src/models/ProblemProgress.js';
import { Submission } from '../src/models/Submission.js';
import { Bookmark } from '../src/models/Bookmark.js';

let mongoServer;

describe('User Dashboard, Progress Tracking & Bookmarks Suite', () => {
  let userA, userACookie;
  let userB, userBCookie;
  let easyProblem, mediumProblem, hardProblem, draftProblem;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Problem.deleteMany({});
    await ProblemProgress.deleteMany({});
    await Submission.deleteMany({});
    await Bookmark.deleteMany({});

    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Cooper',
        username: 'alice_dev',
        email: 'alice@example.com',
        password: 'Password123!'
      });
    userA = resA.body.data.user;
    userACookie = resA.headers['set-cookie'];

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Bob Builder',
        username: 'bob_builder',
        email: 'bob@example.com',
        password: 'Password123!'
      });
    userB = resB.body.data.user;
    userBCookie = resB.headers['set-cookie'];

    // Seed problems
    easyProblem = await Problem.create({
      title: 'Easy Two Sum',
      slug: 'easy-two-sum',
      description: 'Find two indices that sum to target.',
      difficulty: 'Easy',
      topics: ['Arrays', 'Hash Table'],
      publicationStatus: 'published',
      examples: [{ input: '[2,7], 9', output: '[0,1]' }]
    });

    mediumProblem = await Problem.create({
      title: 'Medium Add Two Numbers',
      slug: 'medium-add-two-numbers',
      description: 'Add two numbers represented by linked lists.',
      difficulty: 'Medium',
      topics: ['Linked Lists', 'Math'],
      publicationStatus: 'published',
      examples: [{ input: '[2,4,3], [5,6,4]', output: '[7,0,8]' }]
    });

    hardProblem = await Problem.create({
      title: 'Hard Merge K Lists',
      slug: 'hard-merge-k-lists',
      description: 'Merge k sorted linked lists.',
      difficulty: 'Hard',
      topics: ['Linked Lists', 'Divide and Conquer'],
      publicationStatus: 'published',
      examples: [{ input: '[[1,4,5],[1,3,4],[2,6]]', output: '[1,1,2,3,4,4,5,6]' }]
    });

    draftProblem = await Problem.create({
      title: 'Unpublished Draft Problem',
      slug: 'unpublished-draft-problem',
      description: 'Draft problem under development.',
      difficulty: 'Medium',
      topics: ['Dynamic Programming'],
      publicationStatus: 'draft'
    });
  });

  describe('GET /api/users/me/progress — Real Aggregations & Formulas', () => {
    it('returns accurate zero metrics for a brand new user with no submissions or progress', async () => {
      const res = await request(app)
        .get('/api/users/me/progress')
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      const { overview, topicProgress, activity, recentSubmissions } = res.body.data;

      // Overview checks
      expect(overview.totalSolved).toBe(0);
      expect(overview.totalProblems).toBe(3); // 3 published problems
      expect(overview.solvedPercentage).toBe(0.0);
      expect(overview.difficultyStats.easy).toEqual({ solved: 0, total: 1 });
      expect(overview.difficultyStats.medium).toEqual({ solved: 0, total: 1 });
      expect(overview.difficultyStats.hard).toEqual({ solved: 0, total: 1 });
      expect(overview.submissions.total).toBe(0);
      expect(overview.submissions.accepted).toBe(0);
      expect(overview.submissions.acceptanceRate).toBe(0.0);
      expect(overview.submissions.formula).toBe('(acceptedSubmissions / totalSubmissions) * 100');
      expect(overview.bookmarkedCount).toBe(0);

      // Topic progress contains all catalogue topics with 0 solved
      expect(topicProgress.length).toBeGreaterThan(0);
      const arraysTopic = topicProgress.find((t) => t.topic === 'Arrays');
      expect(arraysTopic).toBeDefined();
      expect(arraysTopic.solved).toBe(0);
      expect(arraysTopic.total).toBe(1);

      // Empty lists
      expect(activity).toEqual([]);
      expect(recentSubmissions).toEqual([]);
    });

    it('calculates correct metrics, acceptance rate, and topic progress for a user with mixed submission results', async () => {
      // User A solves Easy problem
      await ProblemProgress.create({
        userId: userA._id,
        problemId: easyProblem._id,
        status: 'Solved',
        solvedAt: new Date()
      });

      // User A attempts Medium problem (not solved)
      await ProblemProgress.create({
        userId: userA._id,
        problemId: mediumProblem._id,
        status: 'Attempted'
      });

      // User A makes 4 submissions: 2 Accepted, 1 Wrong Answer, 1 Time Limit Exceeded
      await Submission.create([
        {
          userId: userA._id,
          problemId: easyProblem._id,
          language: 'javascript',
          sourceCode: 'solution 1',
          status: 'Accepted',
          executionTimeMs: 45
        },
        {
          userId: userA._id,
          problemId: easyProblem._id,
          language: 'python',
          sourceCode: 'solution 2',
          status: 'Accepted',
          executionTimeMs: 40
        },
        {
          userId: userA._id,
          problemId: mediumProblem._id,
          language: 'javascript',
          sourceCode: 'solution 3',
          status: 'Wrong Answer',
          executionTimeMs: 50
        },
        {
          userId: userA._id,
          problemId: mediumProblem._id,
          language: 'cpp',
          sourceCode: 'solution 4',
          status: 'Time Limit Exceeded',
          executionTimeMs: 2000
        }
      ]);

      const res = await request(app)
        .get('/api/users/me/progress')
        .set('Cookie', userACookie)
        .expect(200);

      const { overview, topicProgress, activity, recentSubmissions } = res.body.data;

      // Overview checks: 1 solved out of 3 published
      expect(overview.totalSolved).toBe(1);
      expect(overview.totalProblems).toBe(3);
      expect(overview.solvedPercentage).toBe(33.3);
      expect(overview.difficultyStats.easy).toEqual({ solved: 1, total: 1 });
      expect(overview.difficultyStats.medium).toEqual({ solved: 0, total: 1 });
      expect(overview.difficultyStats.hard).toEqual({ solved: 0, total: 1 });

      // Submissions: 2 accepted out of 4 total => (2 / 4) * 100 = 50.0%
      expect(overview.submissions.total).toBe(4);
      expect(overview.submissions.accepted).toBe(2);
      expect(overview.submissions.acceptanceRate).toBe(50.0);

      // Topic progress: Arrays should be 1/1 (100%), Linked Lists should be 0/2 (0%)
      const arrays = topicProgress.find((t) => t.topic === 'Arrays');
      expect(arrays.solved).toBe(1);
      expect(arrays.percentage).toBe(100);

      const linkedLists = topicProgress.find((t) => t.topic === 'Linked Lists');
      expect(linkedLists.solved).toBe(0);
      expect(linkedLists.total).toBe(2);
      expect(linkedLists.percentage).toBe(0);

      // Activity over time should have real daily counts
      expect(activity.length).toBe(1);
      expect(activity[0].count).toBe(4);
      expect(activity[0].accepted).toBe(2);

      // Recent submissions has 4 items
      expect(recentSubmissions.length).toBe(4);
      expect(recentSubmissions[0].problemId.title).toBeDefined();
    });

    it('scopes private progress metrics strictly to the authenticated user', async () => {
      // User A solves Easy problem
      await ProblemProgress.create({
        userId: userA._id,
        problemId: easyProblem._id,
        status: 'Solved',
        solvedAt: new Date()
      });

      // User B checks their progress -> should still be 0
      const resB = await request(app)
        .get('/api/users/me/progress')
        .set('Cookie', userBCookie)
        .expect(200);

      expect(resB.body.data.overview.totalSolved).toBe(0);
      expect(resB.body.data.overview.difficultyStats.easy.solved).toBe(0);
    });

    it('rejects unauthenticated requests to /api/users/me/progress with 401 Unauthorized', async () => {
      await request(app)
        .get('/api/users/me/progress')
        .expect(401);
    });
  });

  describe('Bookmarks Workflow & Idempotency', () => {
    it('allows a user to bookmark a problem idempotently without creating duplicate records', async () => {
      // Bookmark once
      const res1 = await request(app)
        .post(`/api/users/me/bookmarks/${easyProblem._id}`)
        .set('Cookie', userACookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .expect(200);

      expect(res1.body.data.bookmarked).toBe(true);

      // Bookmark a second time (idempotent)
      const res2 = await request(app)
        .post(`/api/users/me/bookmarks/${easyProblem._id}`)
        .set('Cookie', userACookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .expect(200);

      expect(res2.body.data.bookmarked).toBe(true);

      // Verify only 1 bookmark record exists in database
      const count = await Bookmark.countDocuments({
        userId: userA._id,
        problemId: easyProblem._id
      });
      expect(count).toBe(1);
    });

    it('retrieves paginated bookmarks populated with problem metadata and solved status', async () => {
      // Mark easy problem as Solved by User A
      await ProblemProgress.create({
        userId: userA._id,
        problemId: easyProblem._id,
        status: 'Solved'
      });

      // Add two bookmarks
      await Bookmark.create([
        { userId: userA._id, problemId: easyProblem._id },
        { userId: userA._id, problemId: mediumProblem._id }
      ]);

      const res = await request(app)
        .get('/api/users/me/bookmarks?page=1&limit=10')
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.totalItems).toBe(2);

      const easyBookmark = res.body.data.find(
        (b) => b.problem._id.toString() === easyProblem._id.toString()
      );
      expect(easyBookmark).toBeDefined();
      expect(easyBookmark.problem.title).toBe('Easy Two Sum');
      expect(easyBookmark.problem.status).toBe('Solved');
      expect(easyBookmark.problem.isBookmarked).toBe(true);
    });

    it('toggles bookmarks reliably', async () => {
      // 1. Toggle ON
      const resToggleOn = await request(app)
        .post(`/api/users/me/bookmarks/${hardProblem._id}/toggle`)
        .set('Cookie', userACookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .expect(200);

      expect(resToggleOn.body.data.bookmarked).toBe(true);

      // 2. Toggle OFF
      const resToggleOff = await request(app)
        .post(`/api/users/me/bookmarks/${hardProblem._id}/toggle`)
        .set('Cookie', userACookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .expect(200);

      expect(resToggleOff.body.data.bookmarked).toBe(false);

      const exists = await Bookmark.exists({
        userId: userA._id,
        problemId: hardProblem._id
      });
      expect(exists).toBeFalsy();
    });

    it('deletes bookmark via DELETE endpoint', async () => {
      await Bookmark.create({ userId: userA._id, problemId: easyProblem._id });

      const res = await request(app)
        .delete(`/api/users/me/bookmarks/${easyProblem._id}`)
        .set('Cookie', userACookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .expect(200);

      expect(res.body.data.bookmarked).toBe(false);

      const count = await Bookmark.countDocuments({
        userId: userA._id,
        problemId: easyProblem._id
      });
      expect(count).toBe(0);
    });

    it('returns 400 when invalid problemId format is supplied', async () => {
      await request(app)
        .post('/api/users/me/bookmarks/not-a-valid-id')
        .set('Cookie', userACookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .expect(400);
    });

    it('annotates isBookmarked on GET /api/problems for authenticated users', async () => {
      // User A bookmarks easyProblem
      await Bookmark.create({ userId: userA._id, problemId: easyProblem._id });

      const res = await request(app)
        .get('/api/problems')
        .set('Cookie', userACookie)
        .expect(200);

      const easy = res.body.data.find((p) => p.slug === 'easy-two-sum');
      const medium = res.body.data.find((p) => p.slug === 'medium-add-two-numbers');

      expect(easy.isBookmarked).toBe(true);
      expect(medium.isBookmarked).toBe(false);
    });
  });

  describe('User Profile & Account Information', () => {
    it('retrieves user profile information without passwordHash', async () => {
      const res = await request(app)
        .get('/api/users/me/profile')
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('alice@example.com');
      expect(res.body.data.username).toBe('alice_dev');
      expect(res.body.data.targetRole).toBe('Software Engineer');
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('updates user profile fields and validates length constraints', async () => {
      const res = await request(app)
        .put('/api/users/me/profile')
        .set('Cookie', userACookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          name: 'Alice C.',
          bio: 'Practicing algorithm problems daily.',
          targetRole: 'Staff Frontend Engineer'
        })
        .expect(200);

      expect(res.body.data.name).toBe('Alice C.');
      expect(res.body.data.bio).toBe('Practicing algorithm problems daily.');
      expect(res.body.data.targetRole).toBe('Staff Frontend Engineer');

      // Verify validation rejects excessively long bio (> 500 chars)
      await request(app)
        .put('/api/users/me/profile')
        .set('Cookie', userACookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          bio: 'A'.repeat(501)
        })
        .expect(400);
    });
  });

  describe('Submission History Filtering & Date Range Queries', () => {
    beforeEach(async () => {
      // Create test submissions across dates and languages
      const date1 = new Date('2026-03-01T10:00:00.000Z');
      const date2 = new Date('2026-03-15T10:00:00.000Z');
      const date3 = new Date('2026-04-01T10:00:00.000Z');

      await Submission.create([
        {
          userId: userA._id,
          problemId: easyProblem._id,
          language: 'javascript',
          sourceCode: 'code 1',
          status: 'Accepted',
          createdAt: date1
        },
        {
          userId: userA._id,
          problemId: easyProblem._id,
          language: 'python',
          sourceCode: 'code 2',
          status: 'Wrong Answer',
          createdAt: date2
        },
        {
          userId: userA._id,
          problemId: mediumProblem._id,
          language: 'cpp',
          sourceCode: 'code 3',
          status: 'Accepted',
          createdAt: date3
        }
      ]);
    });

    it('filters submissions by status', async () => {
      const res = await request(app)
        .get('/api/submissions/me?status=Accepted')
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((s) => s.status === 'Accepted')).toBe(true);
    });

    it('filters submissions by language', async () => {
      const res = await request(app)
        .get('/api/submissions/me?language=python')
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].language).toBe('python');
    });

    it('filters submissions by date range', async () => {
      const res = await request(app)
        .get('/api/submissions/me?startDate=2026-03-10&endDate=2026-03-20')
        .set('Cookie', userACookie)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].language).toBe('python');
    });

    it('rejects invalid date ranges with 400 Bad Request', async () => {
      // startDate later than endDate
      await request(app)
        .get('/api/submissions/me?startDate=2026-04-01&endDate=2026-03-01')
        .set('Cookie', userACookie)
        .expect(400);

      // Malformed date
      await request(app)
        .get('/api/submissions/me?startDate=invalid-date')
        .set('Cookie', userACookie)
        .expect(400);
    });

    it('rejects invalid status filter with 400 Bad Request', async () => {
      await request(app)
        .get('/api/submissions/me?status=SuperPassed')
        .set('Cookie', userACookie)
        .expect(400);
    });
  });
});
