import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Problem } from '../models/Problem.js';
import { ProblemProgress } from '../models/ProblemProgress.js';
import { Submission } from '../models/Submission.js';
import { Bookmark } from '../models/Bookmark.js';
import { AppError } from '../utils/apiResponse.js';
import { formatPaginationMeta } from '../utils/pagination.js';

export const userService = {
  /**
   * Aggregate real progress metrics for the authenticated user.
   * Performs database aggregations without fetching all submissions into memory.
   */
  async getUserProgress(userId) {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1. Total published problems in the catalog by difficulty
    const catalogDifficultyAgg = await Problem.aggregate([
      { $match: { publicationStatus: 'published' } },
      { $group: { _id: '$difficulty', count: { $sum: 1 } } }
    ]);

    const catalogStats = { Easy: 0, Medium: 0, Hard: 0, total: 0 };
    for (const item of catalogDifficultyAgg) {
      if (catalogStats[item._id] !== undefined) {
        catalogStats[item._id] = item.count;
      }
      catalogStats.total += item.count;
    }

    // 2. User unique solved problems by difficulty
    const userSolvedAgg = await ProblemProgress.aggregate([
      { $match: { userId: userObjectId, status: 'Solved' } },
      {
        $lookup: {
          from: 'problems',
          localField: 'problemId',
          foreignField: '_id',
          as: 'problem'
        }
      },
      { $unwind: '$problem' },
      { $match: { 'problem.publicationStatus': 'published' } },
      { $group: { _id: '$problem.difficulty', count: { $sum: 1 } } }
    ]);

    const solvedStats = { Easy: 0, Medium: 0, Hard: 0, total: 0 };
    for (const item of userSolvedAgg) {
      if (solvedStats[item._id] !== undefined) {
        solvedStats[item._id] = item.count;
      }
      solvedStats.total += item.count;
    }

    // 3. User total submissions and acceptance rate calculation
    const [totalSubmissions, acceptedSubmissions] = await Promise.all([
      Submission.countDocuments({ userId: userObjectId }),
      Submission.countDocuments({ userId: userObjectId, status: 'Accepted' })
    ]);

    // Clearly defined acceptance rate formula: (acceptedSubmissions / totalSubmissions) * 100
    const acceptanceRate = totalSubmissions > 0
      ? Number(((acceptedSubmissions / totalSubmissions) * 100).toFixed(1))
      : 0.0;

    // 4. Topic-wise progress aggregation
    const [allTopicsAgg, userSolvedTopicsAgg] = await Promise.all([
      Problem.aggregate([
        { $match: { publicationStatus: 'published' } },
        { $unwind: '$topics' },
        { $group: { _id: '$topics', total: { $sum: 1 } } }
      ]),
      ProblemProgress.aggregate([
        { $match: { userId: userObjectId, status: 'Solved' } },
        {
          $lookup: {
            from: 'problems',
            localField: 'problemId',
            foreignField: '_id',
            as: 'problem'
          }
        },
        { $unwind: '$problem' },
        { $match: { 'problem.publicationStatus': 'published' } },
        { $unwind: '$problem.topics' },
        { $group: { _id: '$problem.topics', count: { $sum: 1 } } }
      ])
    ]);

    const solvedTopicMap = new Map(userSolvedTopicsAgg.map((t) => [t._id, t.count]));
    const topicProgress = allTopicsAgg
      .map((t) => {
        const topic = t._id;
        const total = t.total;
        const solved = solvedTopicMap.get(topic) || 0;
        const percentage = total > 0 ? Math.round((solved / total) * 100) : 0;
        return { topic, solved, total, percentage };
      })
      .sort((a, b) => b.total - a.total);

    // 5. Real daily activity over time (past 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    const activityAgg = await Submission.aggregate([
      {
        $match: {
          userId: userObjectId,
          createdAt: { $gte: ninetyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          accepted: {
            $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const activity = activityAgg.map((a) => ({
      date: a._id,
      count: a.count,
      accepted: a.accepted
    }));

    // 6. Recent 10 submissions for dashboard overview
    const recentSubmissions = await Submission.find({ userId: userObjectId })
      .populate('problemId', 'title slug difficulty')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // 7. Bookmarks count
    const bookmarkedCount = await Bookmark.countDocuments({ userId: userObjectId });

    return {
      overview: {
        totalSolved: solvedStats.total,
        totalProblems: catalogStats.total,
        solvedPercentage: catalogStats.total > 0
          ? Number(((solvedStats.total / catalogStats.total) * 100).toFixed(1))
          : 0.0,
        difficultyStats: {
          easy: { solved: solvedStats.Easy, total: catalogStats.Easy },
          medium: { solved: solvedStats.Medium, total: catalogStats.Medium },
          hard: { solved: solvedStats.Hard, total: catalogStats.Hard }
        },
        submissions: {
          total: totalSubmissions,
          accepted: acceptedSubmissions,
          acceptanceRate,
          formula: '(acceptedSubmissions / totalSubmissions) * 100'
        },
        bookmarkedCount
      },
      topicProgress,
      activity,
      recentSubmissions
    };
  },

  /**
   * Retrieve paginated bookmarked problems for the authenticated user.
   */
  async getUserBookmarks(userId, { page = 1, limit = 20, search } = {}) {
    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const matchQuery = { userId: userObjectId };

    const [bookmarks, totalItems] = await Promise.all([
      Bookmark.find(matchQuery)
        .populate({
          path: 'problemId',
          select: 'title slug difficulty topics acceptanceRate submissionCount publicationStatus'
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Bookmark.countDocuments(matchQuery)
    ]);

    // Filter out any populated problems that may have been deleted or unpublished
    const validBookmarks = bookmarks.filter((b) => b.problemId && b.problemId.publicationStatus === 'published');
    const problemIds = validBookmarks.map((b) => b.problemId._id);

    // Fetch user progress for these bookmarked problems
    const progressRecords = await ProblemProgress.find({
      userId: userObjectId,
      problemId: { $in: problemIds }
    }).lean();

    const progressMap = new Map(
      progressRecords.map((p) => [p.problemId.toString(), p.status])
    );

    const formatted = validBookmarks.map((b) => ({
      bookmarkId: b._id,
      bookmarkedAt: b.createdAt,
      problem: {
        ...b.problemId,
        status: progressMap.get(b.problemId._id.toString()) || 'Unsolved',
        isBookmarked: true
      }
    }));

    // Optional in-memory search filter if client searches within bookmarks
    const finalItems = search
      ? formatted.filter((item) =>
          item.problem.title.toLowerCase().includes(search.toLowerCase().trim())
        )
      : formatted;

    const meta = formatPaginationMeta(totalItems, pageNum, limitNum);

    return {
      bookmarks: finalItems,
      meta
    };
  },

  /**
   * Add a problem bookmark for the authenticated user.
   * Idempotent: does not create duplicate records.
   */
  async addBookmark(userId, problemId) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const problemObjectId = new mongoose.Types.ObjectId(problemId);

    const problem = await Problem.findById(problemObjectId);
    if (!problem) {
      throw new AppError('Problem not found', 404, 'PROBLEM_NOT_FOUND');
    }

    const bookmark = await Bookmark.findOneAndUpdate(
      { userId: userObjectId, problemId: problemObjectId },
      { $setOnInsert: { userId: userObjectId, problemId: problemObjectId } },
      { upsert: true, new: true }
    );

    return {
      bookmarked: true,
      problemId: problem._id,
      bookmarkId: bookmark._id
    };
  },

  /**
   * Remove a problem bookmark for the authenticated user.
   * Idempotent: returns false if record did not exist.
   */
  async removeBookmark(userId, problemId) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const problemObjectId = new mongoose.Types.ObjectId(problemId);

    await Bookmark.findOneAndDelete({
      userId: userObjectId,
      problemId: problemObjectId
    });

    return {
      bookmarked: false,
      problemId: problemObjectId
    };
  },

  /**
   * Toggle a problem bookmark for the authenticated user.
   */
  async toggleBookmark(userId, problemId) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const problemObjectId = new mongoose.Types.ObjectId(problemId);

    const existing = await Bookmark.findOne({
      userId: userObjectId,
      problemId: problemObjectId
    });

    if (existing) {
      await Bookmark.findByIdAndDelete(existing._id);
      return {
        bookmarked: false,
        problemId: problemObjectId
      };
    }

    const problem = await Problem.findById(problemObjectId);
    if (!problem) {
      throw new AppError('Problem not found', 404, 'PROBLEM_NOT_FOUND');
    }

    const created = await Bookmark.create({
      userId: userObjectId,
      problemId: problemObjectId
    });

    return {
      bookmarked: true,
      problemId: problemObjectId,
      bookmarkId: created._id
    };
  },

  /**
   * Retrieve basic user profile.
   */
  async getUserProfile(userId) {
    const user = await User.findById(userId).select('-passwordHash').lean();
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return user;
  },

  /**
   * Update editable profile fields: name, bio, targetRole.
   */
  async updateUserProfile(userId, { name, bio, targetRole } = {}) {
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (bio !== undefined) updates.bio = bio.trim();
    if (targetRole !== undefined) updates.targetRole = targetRole.trim();

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true
    }).select('-passwordHash');

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user;
  }
};
