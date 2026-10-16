import mongoose from 'mongoose';
import { Problem } from '../models/Problem.js';
import { ProblemProgress } from '../models/ProblemProgress.js';
import { Bookmark } from '../models/Bookmark.js';
import { Submission } from '../models/Submission.js';
import { AuditLog } from '../models/AuditLog.js';
import { buildProblemFilter } from '../utils/queryFilter.js';
import { getPaginationParams, formatPaginationMeta } from '../utils/pagination.js';
import { AppError } from '../utils/apiResponse.js';

/**
 * Service to retrieve a paginated, filtered list of published problems.
 * Annotates problems with user's solved status and bookmark status if authenticated.
 * Private judge test cases are strictly hidden.
 */
export async function getProblems(queryParams = {}, { userId = null, includeUnpublished = false } = {}) {
  const filter = buildProblemFilter(queryParams, includeUnpublished);
  const { page, limit, skip } = getPaginationParams(queryParams);

  const [rawProblems, totalItems] = await Promise.all([
    Problem.find(filter)
      .select('-judgeTestCases')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Problem.countDocuments(filter)
  ]);

  // If user is authenticated, annotate problems with their current progress and bookmark status
  let problems = rawProblems;
  if (userId && rawProblems.length > 0) {
    const problemIds = rawProblems.map((p) => p._id);
    const [progressRecords, bookmarkRecords] = await Promise.all([
      ProblemProgress.find({
        userId,
        problemId: { $in: problemIds }
      }).lean(),
      Bookmark.find({
        userId,
        problemId: { $in: problemIds }
      }).lean()
    ]);

    const progressMap = new Map(
      progressRecords.map((rec) => [rec.problemId.toString(), rec.status])
    );
    const bookmarkSet = new Set(
      bookmarkRecords.map((b) => b.problemId.toString())
    );

    problems = rawProblems.map((p) => ({
      ...p,
      status: progressMap.get(p._id.toString()) || 'Unsolved',
      isBookmarked: bookmarkSet.has(p._id.toString())
    }));
  } else {
    problems = rawProblems.map((p) => ({
      ...p,
      status: 'Unsolved',
      isBookmarked: false
    }));
  }

  const meta = formatPaginationMeta(totalItems, page, limit);

  return {
    problems,
    meta
  };
}

/**
 * Service to retrieve a single published problem by its unique slug.
 * Private judge test cases remain strictly inaccessible.
 */
export async function getProblemBySlug(slug, { userId = null, includeUnpublished = false } = {}) {
  const query = { slug };
  if (!includeUnpublished) {
    query.publicationStatus = 'published';
  }

  const problem = await Problem.findOne(query)
    .select('-judgeTestCases')
    .lean();

  if (!problem) {
    throw new AppError(`Problem not found with slug: '${slug}'`, 404, 'PROBLEM_NOT_FOUND');
  }

  let userProgress = { status: 'Unsolved' };
  let isBookmarked = false;
  if (userId) {
    const [progress, bookmark] = await Promise.all([
      ProblemProgress.findOne({
        userId,
        problemId: problem._id
      }).lean(),
      Bookmark.findOne({
        userId,
        problemId: problem._id
      }).lean()
    ]);

    if (progress) {
      userProgress = {
        status: progress.status,
        solvedAt: progress.solvedAt
      };
    }
    if (bookmark) {
      isBookmarked = true;
    }
  }

  return {
    ...problem,
    userProgress,
    isBookmarked
  };
}

/**
 * Admin: Retrieve all problems (including drafts) for management overview.
 * Annotates each problem with total submission counts.
 */
export async function getAllAdminProblems() {
  const problems = await Problem.find({})
    .sort({ createdAt: -1 })
    .lean();

  if (problems.length === 0) {
    return [];
  }

  const problemIds = problems.map((p) => p._id);
  const submissionCounts = await Submission.aggregate([
    { $match: { problemId: { $in: problemIds } } },
    { $group: { _id: '$problemId', totalSubmissions: { $sum: 1 } } }
  ]);

  const countMap = new Map();
  submissionCounts.forEach((s) => countMap.set(s._id.toString(), s.totalSubmissions));

  return problems.map((p) => ({
    ...p,
    totalSubmissions: countMap.get(p._id.toString()) || 0
  }));
}

/**
 * Admin: Retrieve a single problem by ID or slug including judge test cases.
 */
export async function getAdminProblem(idOrSlug) {
  const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);
  const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

  const problem = await Problem.findOne(query)
    .select('+judgeTestCases')
    .lean();

  if (!problem) {
    throw new AppError(`Problem not found with identifier: '${idOrSlug}'`, 404, 'PROBLEM_NOT_FOUND');
  }

  const submissionCount = await Submission.countDocuments({ problemId: problem._id });
  return {
    ...problem,
    totalSubmissions: submissionCount
  };
}

/**
 * Admin: Create a new problem with judge test cases and audit logging.
 */
export async function createProblem(problemData, adminUser = null, ipAddress = '') {
  const slug = problemData.slug.trim().toLowerCase();
  const existing = await Problem.findOne({ slug });
  if (existing) {
    throw new AppError(`A problem with slug '${slug}' already exists`, 409, 'DUPLICATE_SLUG');
  }

  const problem = await Problem.create({
    ...problemData,
    slug
  });

  if (adminUser) {
    await AuditLog.create({
      action: 'CREATE_PROBLEM',
      targetType: 'Problem',
      targetId: problem._id,
      targetTitle: problem.title,
      adminId: adminUser._id,
      adminUsername: adminUser.username,
      ipAddress,
      details: {
        slug: problem.slug,
        difficulty: problem.difficulty,
        publicationStatus: problem.publicationStatus,
        testCasesCount: problemData.judgeTestCases?.length || 0
      }
    });
  }

  const problemObj = problem.toObject();
  delete problemObj.__v;
  return problemObj;
}

/**
 * Admin: Update an existing problem by ID or slug with audit logging.
 */
export async function updateProblem(idOrSlug, updateData, adminUser = null, ipAddress = '') {
  const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);
  const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

  const problem = await Problem.findOne(query).select('+judgeTestCases');
  if (!problem) {
    throw new AppError(`Problem not found with identifier: '${idOrSlug}'`, 404, 'PROBLEM_NOT_FOUND');
  }

  // If slug is being updated, verify it doesn't conflict with another problem
  if (updateData.slug && updateData.slug.toLowerCase() !== problem.slug) {
    const slugExists = await Problem.findOne({
      slug: updateData.slug.toLowerCase(),
      _id: { $ne: problem._id }
    });
    if (slugExists) {
      throw new AppError(`Slug '${updateData.slug}' is already taken by another problem`, 409, 'DUPLICATE_SLUG');
    }
  }

  const prevTitle = problem.title;
  const prevStatus = problem.publicationStatus;

  Object.assign(problem, updateData);
  await problem.save();

  if (adminUser) {
    await AuditLog.create({
      action: 'UPDATE_PROBLEM',
      targetType: 'Problem',
      targetId: problem._id,
      targetTitle: problem.title,
      adminId: adminUser._id,
      adminUsername: adminUser.username,
      ipAddress,
      details: {
        previousTitle: prevTitle,
        previousStatus: prevStatus,
        difficulty: problem.difficulty,
        publicationStatus: problem.publicationStatus,
        updatedFields: Object.keys(updateData)
      }
    });
  }

  const problemObj = problem.toObject();
  delete problemObj.__v;
  return problemObj;
}

/**
 * Admin: Toggle or set publication status with audit logging.
 */
export async function updatePublicationStatus(idOrSlug, publicationStatus, adminUser = null, ipAddress = '') {
  const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);
  const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

  const existing = await Problem.findOne(query);
  if (!existing) {
    throw new AppError(`Problem not found with identifier: '${idOrSlug}'`, 404, 'PROBLEM_NOT_FOUND');
  }

  const prevStatus = existing.publicationStatus;
  existing.publicationStatus = publicationStatus;
  await existing.save();

  if (adminUser) {
    await AuditLog.create({
      action: 'TOGGLE_PUBLICATION',
      targetType: 'Problem',
      targetId: existing._id,
      targetTitle: existing.title,
      adminId: adminUser._id,
      adminUsername: adminUser.username,
      ipAddress,
      details: {
        previousStatus: prevStatus,
        newStatus: publicationStatus
      }
    });
  }

  return existing.toJSON();
}

/**
 * Admin: Delete a problem with submission history protection and audit logging.
 */
export async function deleteProblem(idOrSlug, { force = false } = {}, adminUser = null, ipAddress = '') {
  const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);
  const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

  const problem = await Problem.findOne(query);
  if (!problem) {
    throw new AppError(`Problem not found with identifier: '${idOrSlug}'`, 404, 'PROBLEM_NOT_FOUND');
  }

  const submissionCount = await Submission.countDocuments({ problemId: problem._id });
  if (submissionCount > 0 && !force) {
    throw new AppError(
      `Cannot delete problem "${problem.title}" because it has ${submissionCount} submission record(s). Unpublish or archive the problem instead to preserve audit history, or confirm permanent deletion with force=true.`,
      409,
      'PROBLEM_HAS_SUBMISSIONS'
    );
  }

  await Problem.deleteOne({ _id: problem._id });
  await ProblemProgress.deleteMany({ problemId: problem._id });
  await Bookmark.deleteMany({ problemId: problem._id });
  if (force && submissionCount > 0) {
    await Submission.deleteMany({ problemId: problem._id });
  }

  if (adminUser) {
    await AuditLog.create({
      action: 'DELETE_PROBLEM',
      targetType: 'Problem',
      targetId: problem._id,
      targetTitle: problem.title,
      adminId: adminUser._id,
      adminUsername: adminUser.username,
      ipAddress,
      details: {
        forced: force,
        submissionsDeleted: submissionCount
      }
    });
  }

  return {
    deleted: true,
    id: problem._id,
    submissionsDeleted: force ? submissionCount : 0
  };
}

/**
 * Admin: Retrieve paginated audit logs for administrative oversight.
 */
export async function getAuditLogs({ page = 1, limit = 20 } = {}) {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const [logs, total] = await Promise.all([
    AuditLog.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    AuditLog.countDocuments({})
  ]);

  return {
    items: logs,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      totalItems: total,
      totalPages: Math.ceil(total / parsedLimit) || 1
    }
  };
}
