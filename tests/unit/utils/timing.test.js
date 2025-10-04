import { test, describe } from 'node:test';
import assert from 'node:assert';
import { measureTime } from '../../../src/utils/timing.js';

describe('timing utilities', () => {
  describe('measureTime()', () => {
    test('should measure execution time of sync function', async () => {
      const syncFn = () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      };

      const { result, duration } = await measureTime(syncFn);

      assert.strictEqual(result, 499500); // Sum of 0 to 999
      assert.ok(typeof duration === 'number');
      assert.ok(duration >= 0);
      assert.ok(duration < 1000); // Should be fast
    });

    test('should measure execution time of async function', async () => {
      const asyncFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      };

      const { result, duration } = await measureTime(asyncFn);

      assert.strictEqual(result, 'done');
      assert.ok(typeof duration === 'number');
      assert.ok(duration >= 10); // At least 10ms
      assert.ok(duration < 100); // But not too long
    });

    test('should handle function that throws error', async () => {
      const errorFn = () => {
        throw new Error('Test error');
      };

      const { error, duration } = await measureTime(errorFn);

      assert.ok(error);
      assert.strictEqual(error.message, 'Test error');
      assert.ok(typeof duration === 'number');
      assert.ok(duration >= 0);
    });

    test('should handle async function that rejects', async () => {
      const rejectFn = async () => {
        throw new Error('Async error');
      };

      const { error, duration } = await measureTime(rejectFn);

      assert.ok(error);
      assert.strictEqual(error.message, 'Async error');
      assert.ok(typeof duration === 'number');
      assert.ok(duration >= 0);
    });

    test('should handle function returning undefined', async () => {
      const voidFn = () => undefined;

      const { result, duration } = await measureTime(voidFn);

      assert.strictEqual(result, undefined);
      assert.ok(typeof duration === 'number');
      assert.ok(duration >= 0);
    });

    test('should handle complex return values', async () => {
      const complexFn = () => ({
        data: [1, 2, 3],
        nested: { key: 'value' }
      });

      const { result, duration } = await measureTime(complexFn);

      assert.deepStrictEqual(result, {
        data: [1, 2, 3],
        nested: { key: 'value' }
      });
      assert.ok(typeof duration === 'number');
    });
  });
});
