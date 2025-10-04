/**
 * Path utilities for navigating nested objects
 */

/**
 * Get value from nested object using dot notation
 * @param {any} obj - Object to traverse
 * @param {string} path - Dot-separated path (e.g. "a.b.c")
 * @returns {any} Value at path or undefined
 */
export function getPath(obj, path) {
  if (!path) return obj;

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current == null) return undefined;

    // Support array indexing like "array[0]"
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, prop, index] = arrayMatch;
      current = current[prop];
      if (current == null) return undefined;
      current = current[parseInt(index, 10)];
    } else {
      current = current[part];
    }
  }

  return current;
}

/**
 * Set value in nested object using dot notation
 * @param {any} obj - Object to modify
 * @param {string} path - Dot-separated path (e.g. "a.b.c")
 * @param {any} value - Value to set
 */
export function setPath(obj, path, value) {
  if (!path) return;

  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    // Handle array indexing
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, prop, index] = arrayMatch;
      if (!current[prop]) current[prop] = [];
      current = current[prop];
      if (!current[index]) current[index] = {};
      current = current[index];
    } else {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
  }

  // Set the final value
  const lastPart = parts[parts.length - 1];
  const arrayMatch = lastPart.match(/^(.+)\[(\d+)\]$/);
  if (arrayMatch) {
    const [, prop, index] = arrayMatch;
    if (!current[prop]) current[prop] = [];
    current[prop][parseInt(index, 10)] = value;
  } else {
    current[lastPart] = value;
  }
}
