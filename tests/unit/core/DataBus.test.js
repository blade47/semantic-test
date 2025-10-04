import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DataBus } from '../../../src/core/DataBus.js';

describe('DataBus', () => {
  let dataBus;

  beforeEach(() => {
    dataBus = new DataBus();
  });

  describe('set/get operations', () => {
    test('should set and get simple values', () => {
      dataBus.set('key', 'value');
      assert.strictEqual(dataBus.get('key'), 'value');
    });

    test('should set and get complex objects', () => {
      const obj = { name: 'test', count: 42, nested: { value: true } };
      dataBus.set('data', obj);
      assert.deepStrictEqual(dataBus.get('data'), obj);
    });

    test('should support path notation for getting nested values', () => {
      dataBus.set('response', { status: 200, body: { message: 'OK' } });
      assert.strictEqual(dataBus.get('response.status'), 200);
      assert.strictEqual(dataBus.get('response.body.message'), 'OK');
    });

    test('should return undefined for non-existent keys', () => {
      assert.strictEqual(dataBus.get('nonexistent'), undefined);
    });

    test('should return undefined for invalid paths', () => {
      dataBus.set('data', { level1: { level2: 'value' } });
      assert.strictEqual(dataBus.get('data.level1.level3.level4'), undefined);
    });

    test('should handle null and undefined values', () => {
      dataBus.set('nullValue', null);
      dataBus.set('undefinedValue', undefined);
      assert.strictEqual(dataBus.get('nullValue'), null);
      assert.strictEqual(dataBus.get('undefinedValue'), undefined);
    });

    test('should overwrite existing values', () => {
      dataBus.set('key', 'initial');
      dataBus.set('key', 'updated');
      assert.strictEqual(dataBus.get('key'), 'updated');
    });
  });

  describe('has method', () => {
    test('should return true for existing keys', () => {
      dataBus.set('exists', 'value');
      assert.strictEqual(dataBus.has('exists'), true);
    });

    test('should return false for non-existent keys', () => {
      assert.strictEqual(dataBus.has('notExists'), false);
    });

    test('should work with path notation', () => {
      dataBus.set('nested', { inner: { value: 'test' } });
      assert.strictEqual(dataBus.has('nested.inner.value'), true);
      assert.strictEqual(dataBus.has('nested.inner.missing'), false);
    });
  });

  describe('delete method', () => {
    test('should delete existing keys', () => {
      dataBus.set('toDelete', 'value');
      assert.strictEqual(dataBus.has('toDelete'), true);
      dataBus.delete('toDelete');
      assert.strictEqual(dataBus.has('toDelete'), false);
    });

    test('should not throw when deleting non-existent keys', () => {
      assert.doesNotThrow(() => dataBus.delete('nonExistent'));
    });
  });


  describe('keys method', () => {
    test('should return all slot keys', () => {
      dataBus.set('key1', 'value1');
      dataBus.set('key2', 'value2');
      dataBus.set('key3', 'value3');

      const keys = dataBus.keys();
      assert.deepStrictEqual(keys.sort(), ['key1', 'key2', 'key3']);
    });

    test('should return empty array for empty DataBus', () => {
      assert.deepStrictEqual(dataBus.keys(), []);
    });
  });

  describe('toObject method', () => {
    test('should convert DataBus to plain object', () => {
      dataBus.set('string', 'text');
      dataBus.set('number', 42);
      dataBus.set('object', { nested: true });

      const obj = dataBus.toObject();
      assert.deepStrictEqual(obj, {
        string: 'text',
        number: 42,
        object: { nested: true }
      });
    });

    test('should return empty object for empty DataBus', () => {
      assert.deepStrictEqual(dataBus.toObject(), {});
    });
  });

  describe('clear method', () => {
    test('should clear all slots', () => {
      dataBus.set('key1', 'value1');
      dataBus.set('key2', 'value2');
      assert.strictEqual(dataBus.keys().length, 2);

      dataBus.clear();
      assert.strictEqual(dataBus.keys().length, 0);
    });

    test('should return self for chaining', () => {
      const result = dataBus.clear();
      assert.strictEqual(result, dataBus);
    });
  });


  describe('edge cases', () => {
    test('should handle empty string keys', () => {
      dataBus.set('', 'empty key');
      assert.strictEqual(dataBus.get(''), 'empty key');
    });

    test('should handle array values', () => {
      const arr = [1, 2, { three: 3 }];
      dataBus.set('array', arr);
      assert.deepStrictEqual(dataBus.get('array'), arr);
      assert.strictEqual(dataBus.get('array.2.three'), 3);
    });

    test('should handle boolean values', () => {
      dataBus.set('boolTrue', true);
      dataBus.set('boolFalse', false);
      assert.strictEqual(dataBus.get('boolTrue'), true);
      assert.strictEqual(dataBus.get('boolFalse'), false);
    });

    test('should handle numeric keys in path notation', () => {
      dataBus.set('items', ['first', 'second', 'third']);
      assert.strictEqual(dataBus.get('items.0'), 'first');
      assert.strictEqual(dataBus.get('items.1'), 'second');
      assert.strictEqual(dataBus.get('items.2'), 'third');
    });

    test('should handle special characters in keys', () => {
      const specialKey = 'key-with.dots-and_underscores';
      dataBus.set(specialKey, 'special');
      assert.strictEqual(dataBus.get(specialKey), 'special');
    });
  });

  describe('chaining', () => {
    test('should support method chaining for set operations', () => {
      const result = dataBus
        .set('key1', 'value1')
        .set('key2', 'value2')
        .delete('key1')
        .clear()
        .set('key3', 'value3');

      assert.strictEqual(result, dataBus);
      assert.strictEqual(dataBus.keys().length, 1);
      assert.strictEqual(dataBus.get('key3'), 'value3');
    });
  });
});
