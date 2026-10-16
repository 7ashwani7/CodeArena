import { submissionService } from '../services/submission.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const submissionController = {
  /**
   * POST /api/submissions
   * Submit code for official evaluation against all judge test cases.
   */
  async createSubmission(req, res, next) {
    try {
      const { problemId, language, sourceCode } = req.body;
      const result = await submissionService.submitSolution({
        problemId,
        language,
        sourceCode,
        user: req.user
      });

      sendSuccess(res, { data: result, statusCode: 201 });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/submissions/run
   * Run code against sample visible test cases without recording a formal submission.
   */
  async runSampleCases(req, res, next) {
    try {
      const { problemId, language, sourceCode } = req.body;
      const result = await submissionService.runSampleTestCases({
        problemId,
        language,
        sourceCode
      });

      sendSuccess(res, { data: result, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/submissions/me
   * Retrieve submission history for current authenticated user.
   */
  async getMySubmissions(req, res, next) {
    try {
      const { problemId, status, language, startDate, endDate, page, limit } = req.query;
      const { submissions, meta } = await submissionService.getUserSubmissions(
        req.user._id,
        { problemId, status, language, startDate, endDate, page, limit }
      );

      sendSuccess(res, { data: submissions, meta, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/submissions/:id
   * Retrieve a single submission record by ID.
   */
  async getSubmissionById(req, res, next) {
    try {
      const submission = await submissionService.getSubmissionById(
        req.params.id,
        req.user
      );

      sendSuccess(res, { data: submission, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }
};
