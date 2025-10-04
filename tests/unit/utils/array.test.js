import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ensureArray } from '../../../src/utils/array.js';

describe('array utilities', () => {
  describe('ensureArray()', () => {
    test('should return array as-is if already an array', () => {
      const input = [1, 2, 3];
      const result = ensureArray(input);
      assert.deepStrictEqual(result, [1, 2, 3]);
      assert.strictEqual(result, input); // Same reference
    });

    test('should wrap non-array value in array', () => {
      assert.deepStrictEqual(ensureArray('string'), ['string']);
      assert.deepStrictEqual(ensureArray(123), [123]);
      assert.deepStrictEqual(ensureArray(true), [true]);
      assert.deepStrictEqual(ensureArray({ key: 'value' }), [{ key: 'value' }]);
    });

    test('should return empty array for null', () => {
      assert.deepStrictEqual(ensureArray(null), []);
    });

    test('should return empty array for undefined', () => {
      assert.deepStrictEqual(ensureArray(undefined), []);
    });

    test('should return empty array for no arguments', () => {
      assert.deepStrictEqual(ensureArray(), []);
    });

    test('should handle nested arrays correctly', () => {
      const nested = [[1, 2], [3, 4]];
      const result = ensureArray(nested);
      assert.deepStrictEqual(result, [[1, 2], [3, 4]]);
      assert.strictEqual(result, nested);
    });

    test('should handle empty arrays', () => {
      const empty = [];
      const result = ensureArray(empty);
      assert.deepStrictEqual(result, []);
      assert.strictEqual(result, empty);
    });
  });
});
