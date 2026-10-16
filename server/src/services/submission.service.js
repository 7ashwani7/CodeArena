import mongoose from 'mongoose';
import { Problem } from '../models/Problem.js';
import { Submission } from '../models/Submission.js';
import { ProblemProgress } from '../models/ProblemProgress.js';
import { AppError } from '../utils/apiResponse.js';
import { executeJudgeTestCase } from './judge0.service.js';

/**
 * Service managing sandboxed code execution, official submissions, and progress updates.
 */
export const submissionService = {
  /**
   * Run code against public sample test cases without persisting a formal submission.
   */
  async runSampleTestCases({ problemId, language, sourceCode }) {
    const problem = await this.resolveProblem(problemId);

    // Collect public sample test cases (from examples or public judgeTestCases)
    let sampleCases = [];
    if (problem.examples && problem.examples.length > 0) {
      sampleCases = problem.examples.map((ex) => ({
        input: ex.input,
        expectedOutput: ex.output
      }));
    } else {
      const fullProblem = await Problem.findById(problem._id).select('+judgeTestCases');
      sampleCases = (fullProblem.judgeTestCases || []).filter((tc) => !tc.isHidden);
    }

    if (sampleCases.length === 0) {
      sampleCases = [{ input: '', expectedOutput: '' }];
    }

    const results = [];
    let overallStatus = 'Accepted';
    let maxTimeMs = 0;
    let maxMemoryKb = 0;
    let combinedCompileOutput = '';
    let combinedError = '';

    for (let i = 0; i < sampleCases.length; i++) {
      const tc = sampleCases[i];
      const execResult = await executeJudgeTestCase({
        sourceCode,
        language,
        stdin: tc.input,
        expectedOutput: tc.expectedOutput
      });

      maxTimeMs = Math.max(maxTimeMs, execResult.timeMs || 0);
      maxMemoryKb = Math.max(maxMemoryKb, execResult.memoryKb || 0);

      if (execResult.compileOutput && !combinedCompileOutput) {
        combinedCompileOutput = execResult.compileOutput;
      }
      if (execResult.stderr && !combinedError) {
        combinedError = execResult.stderr;
      }

      results.push({
        testCaseIndex: i + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: execResult.stdout,
        status: execResult.status,
        passed: execResult.passed,
        timeMs: execResult.timeMs
      });

      if (!execResult.passed && overallStatus === 'Accepted') {
        overallStatus = execResult.status;
      }
    }

    return {
      status: overallStatus,
      executionTimeMs: maxTimeMs,
      memoryUsageKb: maxMemoryKb,
      testCases: results,
      compileOutput: combinedCompileOutput || null,
      errorDetails: combinedError || null
    };
  },

  /**
   * Formally submits solution for judging against all test cases (including hidden).
   * Updates problem progress and statistics idempotently.
   */
  async submitSolution({ problemId, language, sourceCode, user }) {
    const problem = await this.resolveProblem(problemId, true);

    const testCases = problem.judgeTestCases && problem.judgeTestCases.length > 0
      ? problem.judgeTestCases
      : (problem.examples || []).map((ex) => ({
          input: ex.input,
          expectedOutput: ex.output,
          isHidden: false
        }));

    if (testCases.length === 0) {
      throw new AppError('No judge test cases are configured for this problem.', 400, 'NO_TEST_CASES');
    }

    let passedCount = 0;
    let finalStatus = 'Accepted';
    let maxTimeMs = 0;
    let maxMemoryKb = 0;
    let safeErrorDetails = null;

    // Evaluate test cases sequentially; early exit upon first failing test case
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const execResult = await executeJudgeTestCase({
        sourceCode,
        language,
        stdin: tc.input,
        expectedOutput: tc.expectedOutput
      });

      maxTimeMs = Math.max(maxTimeMs, execResult.timeMs || 0);
      maxMemoryKb = Math.max(maxMemoryKb, execResult.memoryKb || 0);

      if (execResult.passed) {
        passedCount++;
      } else {
        finalStatus = execResult.status;

        // Provide safe error description without leaking hidden test case content
        if (execResult.compileOutput) {
          safeErrorDetails = execResult.compileOutput.slice(0, 1024);
        } else if (tc.isHidden) {
          safeErrorDetails = `Failed on hidden test case #${i + 1}`;
        } else if (execResult.stderr) {
          safeErrorDetails = execResult.stderr.slice(0, 1024);
        } else {
          safeErrorDetails = `Failed on test case #${i + 1}`;
        }

        break;
      }
    }

    // Persist formal submission
    const submission = await Submission.create({
      userId: user._id,
      problemId: problem._id,
      language,
      sourceCode,
      status: finalStatus,
      testCaseCounts: {
        passed: passedCount,
        total: testCases.length
      },
      executionTimeMs: maxTimeMs,
      memoryUsageKb: maxMemoryKb,
      safeErrorDetails
    });

    // Idempotent progress and problem statistics update
    await this.updateProgressAndStats(user._id, problem._id, finalStatus, submission._id);

    return {
      id: submission._id.toString(),
      problemId: problem._id.toString(),
      problemSlug: problem.slug,
      language: submission.language,
      status: submission.status,
      testCaseCounts: submission.testCaseCounts,
      executionTimeMs: submission.executionTimeMs,
      memoryUsageKb: submission.memoryUsageKb,
      safeErrorDetails: submission.safeErrorDetails,
      createdAt: submission.createdAt
    };
  },

  /**
   * Retrieve a specific submission by its MongoDB ID.
   */
  async getSubmissionById(id, user) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid submission ID format.', 400, 'INVALID_ID');
    }

    const submission = await Submission.findById(id).populate('problemId', 'title slug difficulty');
    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    // Authorization: User can only access their own submissions unless admin
    const isOwner = submission.userId.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new AppError('Forbidden: You do not have permission to view this submission.', 403, 'FORBIDDEN');
    }

    return submission;
  },

  /**
   * Retrieve paginated submission history for the authenticated user with filters.
   */
  async getUserSubmissions(userId, { problemId, status, language, startDate, endDate, page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = { userId };

    if (problemId) {
      if (mongoose.Types.ObjectId.isValid(problemId)) {
        filter.problemId = problemId;
      } else {
        // Find problem by slug
        const prob = await Problem.findOne({ slug: problemId });
        if (prob) {
          filter.problemId = prob._id;
        } else {
          // If non-existent slug was passed, yield empty result
          filter.problemId = new mongoose.Types.ObjectId();
        }
      }
    }

    if (status) {
      filter.status = status;
    }

    if (language) {
      filter.language = language.toLowerCase();
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        if (typeof endDate === 'string' && endDate.length === 10) {
          end.setUTCHours(23, 59, 59, 999);
        }
        filter.createdAt.$lte = end;
      }
    }

    const [submissions, totalItems] = await Promise.all([
      Submission.find(filter)
        .populate('problemId', 'title slug difficulty')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Submission.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    return {
      submissions,
      meta: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    };
  },

  /**
   * Updates user problem progress and aggregate problem statistics idempotently.
   */
  async updateProgressAndStats(userId, problemId, finalStatus, submissionId) {
    const isAccepted = finalStatus === 'Accepted';

    if (isAccepted) {
      const existing = await ProblemProgress.findOne({ userId, problemId });

      if (!existing || existing.status !== 'Solved') {
        // First time solved by this user
        await ProblemProgress.findOneAndUpdate(
          { userId, problemId },
          {
            $set: {
              status: 'Solved',
              solvedAt: new Date(),
              bestSubmissionId: submissionId
            },
            $inc: { attemptsCount: 1 }
          },
          { upsert: true, new: true }
        );

        await Problem.findByIdAndUpdate(problemId, {
          $inc: { submissionCount: 1, acceptedCount: 1 }
        });
      } else {
        // User already solved this problem previously
        await ProblemProgress.findOneAndUpdate(
          { userId, problemId },
          { $inc: { attemptsCount: 1 } }
        );

        await Problem.findByIdAndUpdate(problemId, {
          $inc: { submissionCount: 1 }
        });
      }
    } else {
      // Non-accepted submission
      await ProblemProgress.findOneAndUpdate(
        { userId, problemId },
        {
          $setOnInsert: { status: 'Attempted' },
          $inc: { attemptsCount: 1 }
        },
        { upsert: true }
      );

      await Problem.findByIdAndUpdate(problemId, {
        $inc: { submissionCount: 1 }
      });
    }

    // Recalculate problem acceptance rate
    const updated = await Problem.findById(problemId);
    if (updated && updated.submissionCount > 0) {
      updated.acceptanceRate = Math.round((updated.acceptedCount / updated.submissionCount) * 1000) / 10;
      await updated.save();
    }
  },

  /**
   * Helper to resolve problem by MongoDB ID or slug with optional judgeTestCases inclusion.
   */
  async resolveProblem(problemIdentifier, includeJudgeCases = false) {
    let query;
    if (mongoose.Types.ObjectId.isValid(problemIdentifier)) {
      query = Problem.findById(problemIdentifier);
    } else {
      query = Problem.findOne({ slug: problemIdentifier });
    }

    if (includeJudgeCases) {
      query = query.select('+judgeTestCases');
    }

    const problem = await query;
    if (!problem) {
      throw new AppError('Problem not found with given identifier.', 404, 'PROBLEM_NOT_FOUND');
    }

    return problem;
  }
};
