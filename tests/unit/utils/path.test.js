import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getPath, setPath } from '../../../src/utils/path.js';

describe('path utilities', () => {
  describe('getPath()', () => {
    test('should get simple property', () => {
      const obj = { name: 'test' };
      assert.strictEqual(getPath(obj, 'name'), 'test');
    });

    test('should get nested property', () => {
      const obj = { user: { profile: { name: 'John' } } };
      assert.strictEqual(getPath(obj, 'user.profile.name'), 'John');
    });

    test('should get array element', () => {
      const obj = { items: ['a', 'b', 'c'] };
      assert.strictEqual(getPath(obj, 'items[0]'), 'a');
      assert.strictEqual(getPath(obj, 'items[1]'), 'b');
      assert.strictEqual(getPath(obj, 'items[2]'), 'c');
    });

    test('should get nested array element', () => {
      const obj = { data: { items: [{ id: 1 }, { id: 2 }] } };
      assert.strictEqual(getPath(obj, 'data.items[0].id'), 1);
      assert.strictEqual(getPath(obj, 'data.items[1].id'), 2);
    });

    test('should return undefined for non-existent path', () => {
      const obj = { name: 'test' };
      assert.strictEqual(getPath(obj, 'missing'), undefined);
      assert.strictEqual(getPath(obj, 'user.profile'), undefined);
    });

    test('should handle null/undefined object', () => {
      assert.strictEqual(getPath(null, 'name'), undefined);
      assert.strictEqual(getPath(undefined, 'name'), undefined);
    });

    test('should handle empty path', () => {
      const obj = { name: 'test' };
      assert.strictEqual(getPath(obj, ''), obj);
    });

    test('should handle complex paths', () => {
      const obj = {
        users: [
          { name: 'Alice', roles: ['admin'] },
          { name: 'Bob', roles: ['user', 'editor'] }
        ]
      };
      assert.strictEqual(getPath(obj, 'users[0].name'), 'Alice');
      assert.strictEqual(getPath(obj, 'users[1].roles[1]'), 'editor');
    });
  });

  describe('setPath()', () => {
    test('should set simple property', () => {
      const obj = {};
      setPath(obj, 'name', 'test');
      assert.strictEqual(obj.name, 'test');
    });

    test('should set nested property', () => {
      const obj = {};
      setPath(obj, 'user.profile.name', 'John');
      assert.deepStrictEqual(obj, {
        user: { profile: { name: 'John' } }
      });
    });

    test('should set array element', () => {
      const obj = { items: ['a', 'b', 'c'] };
      setPath(obj, 'items[1]', 'changed');
      assert.deepStrictEqual(obj.items, ['a', 'changed', 'c']);
    });

    test('should create array if needed', () => {
      const obj = {};
      setPath(obj, 'items[0]', 'first');
      assert.deepStrictEqual(obj, { items: ['first'] });
    });

    test('should set nested array element', () => {
      const obj = {};
      setPath(obj, 'data.items[0].id', 1);
      assert.deepStrictEqual(obj, {
        data: { items: [{ id: 1 }] }
      });
    });

    test('should overwrite existing value', () => {
      const obj = { name: 'old' };
      setPath(obj, 'name', 'new');
      assert.strictEqual(obj.name, 'new');
    });

    test('should handle null/undefined values', () => {
      const obj = {};
      setPath(obj, 'value', null);
      assert.strictEqual(obj.value, null);

      setPath(obj, 'other', undefined);
      assert.strictEqual(obj.other, undefined);
    });

    test('should create intermediate objects', () => {
      const obj = {};
      setPath(obj, 'a.b.c.d', 'deep');
      assert.deepStrictEqual(obj, {
        a: { b: { c: { d: 'deep' } } }
      });
    });
  });
});
