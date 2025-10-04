import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Context } from '../../../src/core/Context.js';

describe('Context', () => {
  let context;

  beforeEach(() => {
    context = new Context();
  });

  describe('set/get operations', () => {
    test('should set and get values', () => {
      context.set('key', 'value');
      assert.strictEqual(context.get('key'), 'value');
    });

    test('should handle nested objects', () => {
      context.set('config', {
        api: {
          url: 'https://example.com',
          timeout: 5000
        }
      });

      assert.strictEqual(context.get('config').api.url, 'https://example.com');
      assert.strictEqual(context.get('config').api.timeout, 5000);
    });

    test('should overwrite existing values', () => {
      context.set('key', 'initial');
      context.set('key', 'updated');
      assert.strictEqual(context.get('key'), 'updated');
    });

    test('should return undefined for non-existent keys', () => {
      assert.strictEqual(context.get('nonExistent'), undefined);
    });
  });

  describe('has method', () => {
    test('should return true for existing keys', () => {
      context.set('exists', 'value');
      assert.strictEqual(context.has('exists'), true);
    });

    test('should return false for non-existent keys', () => {
      assert.strictEqual(context.has('notExists'), false);
    });
  });

  describe('merge method', () => {
    test('should merge another context', () => {
      context.set('key1', 'value1');
      context.set('key2', 'value2');

      const otherContext = new Context();
      otherContext.set('key2', 'overridden');
      otherContext.set('key3', 'value3');

      context.merge(otherContext);

      assert.strictEqual(context.get('key1'), 'value1');
      assert.strictEqual(context.get('key2'), 'overridden');
      assert.strictEqual(context.get('key3'), 'value3');
    });

    test('should merge plain objects', () => {
      context.set('existing', 'value');

      context.merge({
        existing: 'updated',
        newKey: 'newValue',
        nested: { value: true }
      });

      assert.strictEqual(context.get('existing'), 'updated');
      assert.strictEqual(context.get('newKey'), 'newValue');
      assert.deepStrictEqual(context.get('nested'), { value: true });
    });

    test('should return self for chaining', () => {
      const result = context.merge({ key: 'value' });
      assert.strictEqual(result, context);
    });

    test('should handle empty merge', () => {
      context.set('key', 'value');
      context.merge({});
      assert.strictEqual(context.get('key'), 'value');
    });
  });

  describe('clear method', () => {
    test('should clear all values', () => {
      context.set('key1', 'value1');
      context.set('key2', 'value2');

      context.clear();

      assert.strictEqual(context.has('key1'), false);
      assert.strictEqual(context.has('key2'), false);
      assert.strictEqual(context.toObject().size, undefined);
    });

    test('should return self for chaining', () => {
      const result = context.clear();
      assert.strictEqual(result, context);
    });
  });

  describe('toObject method', () => {
    test('should convert to plain object', () => {
      context.set('string', 'text');
      context.set('number', 42);
      context.set('object', { nested: true });
      context.set('array', [1, 2, 3]);

      const obj = context.toObject();

      // Convert Map entries to object for comparison
      const expected = {
        string: 'text',
        number: 42,
        object: { nested: true },
        array: [1, 2, 3]
      };

      // toObject returns a plain object
      assert.deepStrictEqual(obj, expected);
    });

    test('should return empty object for empty context', () => {
      const obj = context.toObject();
      assert.deepStrictEqual(obj, {});
    });
  });

  describe('environment variables', () => {
    test('should store environment-like variables', () => {
      context.set('NODE_ENV', 'test');
      context.set('API_KEY', 'secret123');
      context.set('DEBUG', true);

      assert.strictEqual(context.get('NODE_ENV'), 'test');
      assert.strictEqual(context.get('API_KEY'), 'secret123');
      assert.strictEqual(context.get('DEBUG'), true);
    });

    test('should merge environment configurations', () => {
      context.merge({
        NODE_ENV: 'production',
        API_URL: 'https://api.example.com',
        TIMEOUT: 30000
      });

      assert.strictEqual(context.get('NODE_ENV'), 'production');
      assert.strictEqual(context.get('API_URL'), 'https://api.example.com');
      assert.strictEqual(context.get('TIMEOUT'), 30000);
    });
  });

  describe('edge cases', () => {
    test('should handle null and undefined values', () => {
      context.set('nullValue', null);
      context.set('undefinedValue', undefined);

      assert.strictEqual(context.get('nullValue'), null);
      assert.strictEqual(context.get('undefinedValue'), undefined);
      assert.strictEqual(context.has('nullValue'), true);
      assert.strictEqual(context.has('undefinedValue'), true);
    });

    test('should handle empty string keys', () => {
      context.set('', 'empty key');
      assert.strictEqual(context.get(''), 'empty key');
      assert.strictEqual(context.has(''), true);
    });

    test('should handle boolean values', () => {
      context.set('isEnabled', true);
      context.set('isDisabled', false);

      assert.strictEqual(context.get('isEnabled'), true);
      assert.strictEqual(context.get('isDisabled'), false);
    });

    test('should handle numeric values', () => {
      context.set('count', 42);
      context.set('pi', 3.14159);
      context.set('negative', -10);
      context.set('zero', 0);

      assert.strictEqual(context.get('count'), 42);
      assert.strictEqual(context.get('pi'), 3.14159);
      assert.strictEqual(context.get('negative'), -10);
      assert.strictEqual(context.get('zero'), 0);
    });

    test('should handle arrays', () => {
      const arr = [1, 'two', { three: 3 }, [4, 5]];
      context.set('array', arr);

      const retrieved = context.get('array');
      assert.deepStrictEqual(retrieved, arr);
      assert.strictEqual(retrieved === arr, true); // Same reference
    });

    test('should handle functions', () => {
      const fn = () => 'test';
      context.set('function', fn);

      const retrieved = context.get('function');
      assert.strictEqual(retrieved, fn);
      assert.strictEqual(retrieved(), 'test');
    });
  });

  describe('chaining', () => {
    test('should support method chaining', () => {
      const result = context
        .set('key1', 'value1')
        .set('key2', 'value2')
        .merge({ key3: 'value3' })
        .set('key4', 'value4');

      assert.strictEqual(result, context);
      assert.strictEqual(context.get('key1'), 'value1');
      assert.strictEqual(context.get('key2'), 'value2');
      assert.strictEqual(context.get('key3'), 'value3');
      assert.strictEqual(context.get('key4'), 'value4');
    });
  });

  describe('isolation', () => {
    test('should not share state between instances', () => {
      const context1 = new Context();
      const context2 = new Context();

      context1.set('key', 'value1');
      context2.set('key', 'value2');

      assert.strictEqual(context1.get('key'), 'value1');
      assert.strictEqual(context2.get('key'), 'value2');
    });

    test('should not affect original when merging', () => {
      const original = new Context();
      original.set('key', 'original');

      const toMerge = new Context();
      toMerge.set('key', 'merged');
      toMerge.set('newKey', 'new');

      context.merge(original);
      context.merge(toMerge);

      assert.strictEqual(original.get('key'), 'original');
      assert.strictEqual(original.has('newKey'), false);
      assert.strictEqual(context.get('key'), 'merged');
      assert.strictEqual(context.get('newKey'), 'new');
    });
  });
});
