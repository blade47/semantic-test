/**
 * Context - Shared state across pipeline execution
 * Stores configuration, environment variables, and runtime state
 */
export class Context {
  constructor(initial = {}) {
    this.data = new Map();
    this.merge(initial);
  }

  /**
   * Set a context value
   */
  set(key, value) {
    this.data.set(key, value);
    return this;
  }

  /**
   * Get a context value
   */
  get(key, defaultValue = undefined) {
    return this.data.has(key) ? this.data.get(key) : defaultValue;
  }

  /**
   * Check if key exists
   */
  has(key) {
    return this.data.has(key);
  }

  /**
   * Delete a key
   */
  delete(key) {
    this.data.delete(key);
    return this;
  }

  /**
   * Merge object or another Context into this context
   */
  merge(obj) {
    if (!obj) return this;

    // Handle Context instance
    if (obj instanceof Context) {
      for (const [key, value] of obj.data) {
        this.data.set(key, value);
      }
    } else {
      // Handle plain object
      for (const [key, value] of Object.entries(obj)) {
        this.data.set(key, value);
      }
    }
    return this;
  }

  /**
   * Get all data as plain object
   */
  toObject() {
    const obj = {};
    for (const [key, value] of this.data) {
      obj[key] = value;
    }
    return obj;
  }

  /**
   * Clear all context
   */
  clear() {
    this.data.clear();
    return this;
  }

  /**
   * Create a child context (inherits from parent)
   */
  child(overrides = {}) {
    const child = new Context(this.toObject());
    child.merge(overrides);
    return child;
  }
}
