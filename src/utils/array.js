/**
 * Array utilities
 */

/**
 * Ensure value is an array
 * @param {any} value - Value to coerce to array
 * @returns {Array} Array containing value or value itself if already array
 */
export function ensureArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
