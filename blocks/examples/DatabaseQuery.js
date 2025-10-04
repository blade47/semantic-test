import { Block } from '../../../src/core/Block.js';

/**
 * Example Custom Block: DatabaseQuery
 *
 * This demonstrates how to create a custom block that interacts
 * with a database. You can use this as a template for your own blocks.
 */
export class DatabaseQuery extends Block {
  static get inputs() {
    return {
      required: ['query'],
      optional: ['params', 'timeout']
    };
  }

  static get outputs() {
    return {
      produces: ['rows', 'count', 'error']
    };
  }

  async process(inputs, _context) {
    const { query: _query, params: _params = [], timeout: _timeout = 5000 } = inputs;

    // Simulate async operation
    await Promise.resolve();

    try {
      // This is where you'd implement your database logic
      // For example, using pg, mysql2, mongodb, etc.

      // Example with postgres:
      // const db = context.get('database');
      // const result = await db.query(query, params);

      // Mock implementation for demonstration
      const mockResults = [
        { id: 1, name: 'Test User', email: 'test@example.com' }
      ];

      return {
        rows: mockResults,
        count: mockResults.length
      };
    } catch (error) {
      return {
        error: error.message,
        rows: [],
        count: 0
      };
    }
  }
}
