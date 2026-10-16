import mongoose from 'mongoose';

/**
 * Validate user profile update payload.
 */
export function validateUpdateProfile(req) {
  const errors = [];
  const { name, bio, targetRole } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string') {
      errors.push({ field: 'name', message: 'Name must be a string.' });
    } else if (name.trim().length > 60) {
      errors.push({ field: 'name', message: 'Name cannot exceed 60 characters.' });
    }
  }

  if (bio !== undefined) {
    if (typeof bio !== 'string') {
      errors.push({ field: 'bio', message: 'Bio must be a string.' });
    } else if (bio.trim().length > 500) {
      errors.push({ field: 'bio', message: 'Bio cannot exceed 500 characters.' });
    }
  }

  if (targetRole !== undefined) {
    if (typeof targetRole !== 'string') {
      errors.push({ field: 'targetRole', message: 'Target role must be a string.' });
    } else if (targetRole.trim().length > 100) {
      errors.push({ field: 'targetRole', message: 'Target role cannot exceed 100 characters.' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate problemId URL parameter.
 */
export function validateProblemIdParam(req) {
  const errors = [];
  const { problemId } = req.params;

  if (!problemId || !mongoose.Types.ObjectId.isValid(problemId)) {
    errors.push({ field: 'problemId', message: 'Invalid problem ID format.' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate bookmark pagination query parameters.
 */
export function validateBookmarkQuery(req) {
  const errors = [];
  const { page, limit } = req.query;

  if (page !== undefined) {
    const parsedPage = Number(page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      errors.push({ field: 'page', message: 'Page must be a positive integer' });
    }
  }

  if (limit !== undefined) {
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      errors.push({ field: 'limit', message: 'Limit must be an integer between 1 and 50' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
