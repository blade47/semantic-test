/**
 * Timing utilities
 */

/**
 * Measure the execution time of an async function
 */
export async function measureTime(fn) {
  const startTime = Date.now();
  try {
    const result = await fn();
    return {
      result,
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      error,
      duration: Date.now() - startTime
    };
  }
}
