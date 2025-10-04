import { getPath } from '../utils/path.js';

/**
 * DataBus - Manages data flow between blocks
 * Provides named slots for data storage and retrieval
 */
export class DataBus {
  constructor() {
    this.slots = new Map();
  }

  /**
   * Set a value in a named slot
   */
  set(name, value) {
    this.slots.set(name, value);
    return this;
  }

  /**
   * Get a value from a slot (supports path notation)
   */
  get(name) {
    if (name === undefined || name === null) return undefined;

    // Support path notation: "response.status"
    // Only split if the key actually contains dots and isn't being used as a literal key
    if (name.includes('.') && !this.slots.has(name)) {
      const [slot, ...pathParts] = name.split('.');
      const base = this.slots.get(slot);
      return getPath(base, pathParts.join('.'));
    }

    return this.slots.get(name);
  }

  /**
   * Check if a slot exists
   */
  has(name) {
    // First check if it's a direct key
    if (this.slots.has(name)) {
      return true;
    }
    // Then check if it's a path notation
    if (name && name.includes('.')) {
      return this.get(name) !== undefined;
    }
    return false;
  }

  /**
   * Delete a slot
   */
  delete(name) {
    this.slots.delete(name);
    return this;
  }

  /**
   * Get all slot names
   */
  keys() {
    return Array.from(this.slots.keys());
  }

  /**
   * Get all data as a plain object
   */
  toObject() {
    return Object.fromEntries(this.slots);
  }

  /**
   * Clear all slots
   */
  clear() {
    this.slots.clear();
    return this;
  }
}
