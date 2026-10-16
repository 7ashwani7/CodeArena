const ALLOWED_DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);

/**
 * Escapes special regex characters in a user search string to prevent regex injection.
 */
export function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Safely constructs a Mongoose filter object from validated query parameters.
 * Strictly avoids arbitrary client object injection into MongoDB queries.
 */
export function buildProblemFilter(queryParams = {}, includeUnpublished = false) {
  const filter = {};

  // Restrict to published problems unless explicit admin override
  if (!includeUnpublished) {
    filter.publicationStatus = 'published';
  } else if (typeof queryParams.status === 'string' && ['published', 'draft', 'archived'].includes(queryParams.status.toLowerCase())) {
    filter.publicationStatus = queryParams.status.toLowerCase();
  }

  // Difficulty filter (strict whitelist)
  if (typeof queryParams.difficulty === 'string') {
    const capitalized = queryParams.difficulty.charAt(0).toUpperCase() + queryParams.difficulty.slice(1).toLowerCase();
    if (ALLOWED_DIFFICULTIES.has(capitalized)) {
      filter.difficulty = capitalized;
    }
  }

  // Topic filter (exact match in topics array)
  if (typeof queryParams.topic === 'string' && queryParams.topic.trim()) {
    filter.topics = queryParams.topic.trim();
  }

  // Search keyword (case-insensitive substring match on title)
  if (typeof queryParams.search === 'string' && queryParams.search.trim()) {
    const sanitizedSearch = escapeRegex(queryParams.search.trim());
    filter.title = { $regex: sanitizedSearch, $options: 'i' };
  }

  return filter;
}
