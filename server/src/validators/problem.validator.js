const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

/**
 * Validates query parameters for GET /api/problems.
 */
export function validateProblemQuery(req) {
  const errors = [];
  const { page, limit, difficulty, topic, search } = req.query;

  if (page !== undefined) {
    const parsedPage = Number(page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      errors.push({ field: 'page', message: 'Page must be a positive integer greater than 0' });
    }
  }

  if (limit !== undefined) {
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      errors.push({ field: 'limit', message: 'Limit must be an integer between 1 and 50' });
    }
  }

  if (difficulty !== undefined && typeof difficulty === 'string') {
    if (!VALID_DIFFICULTIES.has(difficulty.toLowerCase())) {
      errors.push({ field: 'difficulty', message: 'Difficulty must be one of: Easy, Medium, Hard' });
    }
  }

  if (topic !== undefined && typeof topic === 'string' && topic.length > 100) {
    errors.push({ field: 'topic', message: 'Topic filter cannot exceed 100 characters' });
  }

  if (search !== undefined && typeof search === 'string' && search.length > 100) {
    errors.push({ field: 'search', message: 'Search term cannot exceed 100 characters' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates slug param for GET /api/problems/:slug.
 */
export function validateProblemSlug(req) {
  const errors = [];
  const { slug } = req.params;

  if (!slug || typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push({
      field: 'slug',
      message: 'Slug must contain only lowercase alphanumeric characters separated by single hyphens'
    });
  } else if (slug.length < 2 || slug.length > 100) {
    errors.push({
      field: 'slug',
      message: 'Slug length must be between 2 and 100 characters'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

const VALID_STATUSES = new Set(['published', 'draft', 'archived']);

/**
 * Validates problem creation/update body payload for admin routes.
 */
export function validateProblemPayload(req) {
  const errors = [];
  const body = req.body || {};

  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (body.title.trim().length > 200) {
    errors.push({ field: 'title', message: 'Title cannot exceed 200 characters' });
  }

  if (!body.slug || typeof body.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug.trim().toLowerCase())) {
    errors.push({ field: 'slug', message: 'Slug must contain only lowercase alphanumeric characters separated by hyphens' });
  }

  if (!body.difficulty || typeof body.difficulty !== 'string' || !['Easy', 'Medium', 'Hard'].includes(body.difficulty)) {
    errors.push({ field: 'difficulty', message: 'Difficulty must be one of: Easy, Medium, Hard' });
  }

  if (!body.description || typeof body.description !== 'string' || !body.description.trim()) {
    errors.push({ field: 'description', message: 'Description is required' });
  }

  if (body.topics !== undefined && !Array.isArray(body.topics)) {
    errors.push({ field: 'topics', message: 'Topics must be an array of strings' });
  }

  if (body.publicationStatus && !VALID_STATUSES.has(body.publicationStatus)) {
    errors.push({ field: 'publicationStatus', message: 'Publication status must be published, draft, or archived' });
  }

  if (body.examples !== undefined) {
    if (!Array.isArray(body.examples)) {
      errors.push({ field: 'examples', message: 'Examples must be an array' });
    } else {
      body.examples.forEach((ex, idx) => {
        if (!ex || typeof ex !== 'object') {
          errors.push({ field: `examples[${idx}]`, message: 'Example must be an object' });
        } else {
          if (!ex.input || typeof ex.input !== 'string') {
            errors.push({ field: `examples[${idx}].input`, message: 'Example input is required and must be a string' });
          }
          if (!ex.output || typeof ex.output !== 'string') {
            errors.push({ field: `examples[${idx}].output`, message: 'Example output is required and must be a string' });
          }
        }
      });
    }
  }

  if (body.constraints !== undefined) {
    if (!Array.isArray(body.constraints)) {
      errors.push({ field: 'constraints', message: 'Constraints must be an array of strings' });
    } else {
      body.constraints.forEach((c, idx) => {
        if (typeof c !== 'string') {
          errors.push({ field: `constraints[${idx}]`, message: 'Constraint must be a string' });
        }
      });
    }
  }

  if (body.starterCode !== undefined) {
    if (typeof body.starterCode !== 'object' || body.starterCode === null || Array.isArray(body.starterCode)) {
      errors.push({ field: 'starterCode', message: 'Starter code must be an object' });
    }
  }

  if (body.judgeTestCases !== undefined) {
    if (!Array.isArray(body.judgeTestCases)) {
      errors.push({ field: 'judgeTestCases', message: 'Judge test cases must be an array' });
    } else {
      body.judgeTestCases.forEach((tc, idx) => {
        if (!tc || typeof tc !== 'object') {
          errors.push({ field: `judgeTestCases[${idx}]`, message: 'Test case must be an object' });
        } else {
          if (tc.input === undefined || typeof tc.input !== 'string') {
            errors.push({ field: `judgeTestCases[${idx}].input`, message: 'Test case input is required and must be a string' });
          }
          if (tc.expectedOutput === undefined || typeof tc.expectedOutput !== 'string') {
            errors.push({ field: `judgeTestCases[${idx}].expectedOutput`, message: 'Test case expected output is required and must be a string' });
          }
        }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates publication status toggle payload
 */
export function validatePublicationToggle(req) {
  const errors = [];
  const { publicationStatus } = req.body || {};

  if (!publicationStatus || !VALID_STATUSES.has(publicationStatus)) {
    errors.push({ field: 'publicationStatus', message: 'Status must be published, draft, or archived' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates query parameters for problem deletion (optional ?force=true)
 */
export function validateDeleteProblem(req) {
  const errors = [];
  const { force } = req.query || {};

  if (force !== undefined && force !== 'true' && force !== 'false') {
    errors.push({ field: 'force', message: 'Force parameter must be either true or false' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates pagination query parameters for admin audit logs
 */
export function validateAdminAuditQuery(req) {
  const errors = [];
  const { page, limit } = req.query || {};

  if (page !== undefined) {
    const p = Number(page);
    if (!Number.isInteger(p) || p < 1) {
      errors.push({ field: 'page', message: 'Page must be a positive integer greater than 0' });
    }
  }

  if (limit !== undefined) {
    const l = Number(limit);
    if (!Number.isInteger(l) || l < 1 || l > 100) {
      errors.push({ field: 'limit', message: 'Limit must be an integer between 1 and 100' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

