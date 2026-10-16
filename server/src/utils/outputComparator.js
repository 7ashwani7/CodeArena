/**
 * Output Comparison Policy for CodeArena
 *
 * Requirements:
 * 1. Normalize line endings (\r\n and \r to \n).
 * 2. Trim trailing whitespace from each line without altering meaningful internal indentation.
 * 3. Trim outer leading and trailing blank lines.
 * 4. Perform JSON deep structural equality when outputs represent structured data (arrays, objects, numbers, booleans).
 * 5. Case-insensitivity for boolean representations ('true' vs 'True').
 * 6. Fall back to normalized string equality, strictly preserving internal semantics and spaces.
 */

/**
 * Compare actual stdout against expected output using defined policy.
 * @param {string} actualRaw
 * @param {string} expectedRaw
 * @returns {boolean} True if actual matches expected semantics
 */
export function compareOutputs(actualRaw, expectedRaw) {
  const actualStr = typeof actualRaw === 'string' ? actualRaw : String(actualRaw ?? '');
  const expectedStr = typeof expectedRaw === 'string' ? expectedRaw : String(expectedRaw ?? '');

  const normActual = normalizeOutputString(actualStr);
  const normExpected = normalizeOutputString(expectedStr);

  // Exact normalized string match
  if (normActual === normExpected) {
    return true;
  }

  // Check structured JSON equivalence (e.g. "[0, 1]" vs "[0,1]", or key ordering in objects)
  try {
    const jsonActual = JSON.parse(normActual);
    const jsonExpected = JSON.parse(normExpected);
    if (deepEqual(jsonActual, jsonExpected)) {
      return true;
    }
  } catch {
    // Non-JSON format: proceed to semantic checks
  }

  // Boolean representation equivalence ('true' vs 'True')
  const lowerActual = normActual.toLowerCase();
  const lowerExpected = normExpected.toLowerCase();
  if ((lowerActual === 'true' || lowerActual === 'false') && lowerActual === lowerExpected) {
    return true;
  }

  // Numeric value equivalence with tolerance for float rounding
  const numActual = Number(normActual);
  const numExpected = Number(normExpected);
  if (!Number.isNaN(numActual) && !Number.isNaN(numExpected) && normActual !== '' && normExpected !== '') {
    if (Math.abs(numActual - numExpected) < 1e-6) {
      return true;
    }
  }

  return false;
}

/**
 * Normalizes output strings by handling line endings, trailing whitespaces per line,
 * and boundary blank lines while preserving internal spaces.
 * @param {string} str
 * @returns {string}
 */
export function normalizeOutputString(str) {
  if (!str) return '';

  const lines = str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd());

  // Trim leading empty lines
  while (lines.length > 0 && lines[0] === '') {
    lines.shift();
  }
  // Trim trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}

/**
 * Deep structural equality helper
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }

  return false;
}
