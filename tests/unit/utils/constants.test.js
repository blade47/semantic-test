import { test, describe } from 'node:test';
import assert from 'node:assert';
import { LIMITS, SEPARATORS } from '../../../src/utils/constants.js';

describe('constants', () => {
  describe('LIMITS', () => {
    test('should have correct numeric values', () => {
      assert.strictEqual(LIMITS.MAX_LOOP_ITERATIONS, 10);
      assert.strictEqual(LIMITS.STRING_PREVIEW_LENGTH, 100);
    });

    test('should all be positive numbers', () => {
      for (const [key, value] of Object.entries(LIMITS)) {
        assert.ok(typeof value === 'number', `${key} should be a number`);
        assert.ok(value > 0, `${key} should be positive`);
      }
    });
  });

  describe('SEPARATORS', () => {
    test('should have correct string values', () => {
      assert.strictEqual(SEPARATORS.THIN, '─');
      assert.strictEqual(SEPARATORS.THICK, '═');
      assert.strictEqual(SEPARATORS.LENGTH, 60);
    });

    test('should have single character separators', () => {
      assert.strictEqual(SEPARATORS.THIN.length, 1);
      assert.strictEqual(SEPARATORS.THICK.length, 1);
    });

    test('should have reasonable length value', () => {
      assert.ok(SEPARATORS.LENGTH > 0);
      assert.ok(SEPARATORS.LENGTH <= 120); // Reasonable terminal width
    });
  });

  test('constants should be frozen', () => {
    // Test that objects are frozen (immutable)
    assert.ok(Object.isFrozen(LIMITS));
    assert.ok(Object.isFrozen(SEPARATORS));
  });
});
