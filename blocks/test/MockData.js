import { Block } from '../../src/core/Block.js';

/**
 * MockData - Provides mock data for testing
 * Simply returns the configured data
 */
export class MockData extends Block {
  static get inputs() {
    return {
      required: [],
      optional: []
    };
  }

  static get outputs() {
    return {
      produces: ['*'] // Dynamic outputs based on config
    };
  }

  process(_inputs, _context) {
    // Return the mock data from config.data or config.config.data
    // (depending on how block is instantiated)
    const data = this.config.config?.data || this.config.data || {};
    return data;
  }
}
