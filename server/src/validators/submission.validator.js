import { AppError } from '../utils/apiResponse.js';

const VALID_LANGUAGES = ['javascript', 'python', 'cpp', 'java'];
const MAX_SOURCE_CODE_BYTES = 65536; // 64 KB

/**
 * Validate submission creation request body.
 */
export function validateSubmissionPayload(req, res, next) {
  const { problemId, language, sourceCode } = req.body;

  if (!problemId || typeof problemId !== 'string' || !problemId.trim()) {
    return next(new AppError('Problem ID or slug is required.', 400, 'INVALID_PROBLEM_ID'));
  }

  if (!language || typeof language !== 'string' || !VALID_LANGUAGES.includes(language.toLowerCase())) {
    return next(
      new AppError(
        `Language '${language}' is not supported. Supported languages: ${VALID_LANGUAGES.join(', ')}`,
        400,
        'INVALID_LANGUAGE'
      )
    );
  }

  if (!sourceCode || typeof sourceCode !== 'string' || !sourceCode.trim()) {
    return next(new AppError('Source code cannot be empty.', 400, 'EMPTY_SOURCE_CODE'));
  }

  if (Buffer.byteLength(sourceCode, 'utf-8') > MAX_SOURCE_CODE_BYTES) {
    return next(
      new AppError(
        `Source code exceeds maximum allowed size of ${MAX_SOURCE_CODE_BYTES / 1024} KB.`,
        400,
        'SOURCE_CODE_TOO_LARGE'
      )
    );
  }

  req.body.language = language.toLowerCase();
  next();
}

const VALID_STATUSES = [
  'Pending',
  'Accepted',
  'Wrong Answer',
  'Time Limit Exceeded',
  'Memory Limit Exceeded',
  'Runtime Error',
  'Compilation Error'
];

/**
 * Validate submission history query parameters and date range filters.
 */
export function validateSubmissionHistoryQuery(req) {
  const errors = [];
  const { page, limit, status, language, startDate, endDate } = req.query;

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

  if (status !== undefined && status !== '') {
    if (!VALID_STATUSES.includes(status)) {
      errors.push({
        field: 'status',
        message: `Invalid status filter '${status}'. Allowed values: ${VALID_STATUSES.join(', ')}`
      });
    }
  }

  if (language !== undefined && language !== '') {
    if (!VALID_LANGUAGES.includes(language.toLowerCase())) {
      errors.push({
        field: 'language',
        message: `Invalid language filter '${language}'. Allowed values: ${VALID_LANGUAGES.join(', ')}`
      });
    }
  }

  let parsedStart = null;
  let parsedEnd = null;

  if (startDate !== undefined && startDate !== '') {
    parsedStart = new Date(startDate);
    if (Number.isNaN(parsedStart.getTime())) {
      errors.push({ field: 'startDate', message: 'Invalid startDate format. Must be a valid ISO date.' });
    }
  }

  if (endDate !== undefined && endDate !== '') {
    parsedEnd = new Date(endDate);
    if (Number.isNaN(parsedEnd.getTime())) {
      errors.push({ field: 'endDate', message: 'Invalid endDate format. Must be a valid ISO date.' });
    }
  }

  if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
    errors.push({ field: 'dateRange', message: 'startDate must be earlier than or equal to endDate.' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
