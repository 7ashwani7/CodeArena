import * as problemService from '../services/problem.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

/**
 * Controller: GET /api/problems
 * Query params: search, difficulty, topic, page, limit
 */
export async function listProblems(req, res, next) {
  try {
    const { problems, meta } = await problemService.getProblems(req.query, {
      userId: req.user?._id || null
    });

    return sendSuccess(res, {
      data: problems,
      meta,
      message: 'Problems retrieved successfully'
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Controller: GET /api/problems/:slug
 */
export async function getProblem(req, res, next) {
  try {
    const problem = await problemService.getProblemBySlug(req.params.slug, {
      userId: req.user?._id || null
    });

    return sendSuccess(res, {
      data: problem,
      message: 'Problem details retrieved successfully'
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: GET /api/problems/admin/all
 */
export async function adminListProblems(req, res, next) {
  try {
    const problems = await problemService.getAllAdminProblems();
    return sendSuccess(res, {
      data: problems,
      message: 'Admin problems retrieved successfully'
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: GET /api/problems/admin/audit-logs
 */
export async function adminListAuditLogs(req, res, next) {
  try {
    const result = await problemService.getAuditLogs(req.query);
    return sendSuccess(res, {
      data: result.items,
      meta: result.pagination,
      message: 'Audit logs retrieved successfully'
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: GET /api/problems/admin/:id
 */
export async function adminGetProblem(req, res, next) {
  try {
    const problem = await problemService.getAdminProblem(req.params.id);
    return sendSuccess(res, {
      data: problem,
      message: 'Admin problem details retrieved successfully'
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: POST /api/problems
 */
export async function adminCreateProblem(req, res, next) {
  try {
    const problem = await problemService.createProblem(req.body, req.user, req.ip);
    return sendSuccess(
      res,
      {
        data: problem,
        message: 'Problem created successfully'
      },
      null,
      201
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: PUT /api/problems/:id
 */
export async function adminUpdateProblem(req, res, next) {
  try {
    const problem = await problemService.updateProblem(req.params.id, req.body, req.user, req.ip);
    return sendSuccess(res, {
      data: problem,
      message: 'Problem updated successfully'
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: PATCH /api/problems/:id/publication
 */
export async function adminTogglePublication(req, res, next) {
  try {
    const problem = await problemService.updatePublicationStatus(
      req.params.id,
      req.body.publicationStatus,
      req.user,
      req.ip
    );
    return sendSuccess(res, {
      data: problem,
      message: `Problem publication status set to '${req.body.publicationStatus}'`
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: DELETE /api/problems/:id
 */
export async function adminDeleteProblem(req, res, next) {
  try {
    const force = req.query.force === 'true';
    const result = await problemService.deleteProblem(req.params.id, { force }, req.user, req.ip);
    return sendSuccess(res, {
      data: result,
      message: 'Problem deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
}
