import { test, describe } from 'node:test';
import assert from 'node:assert';
import { MockData } from '../../../blocks/test/MockData.js';
import { Context } from '../../../src/core/Context.js';

describe('MockData Block', () => {
  let block;
  let context;

  test('should return configured data', async () => {
    const mockData = {
      name: 'test',
      value: 123,
      nested: { key: 'value' }
    };

    block = new MockData({
      id: 'mock',
      config: { data: mockData }
    });

    context = new Context();

    const result = await block.execute({}, context);

    assert.deepStrictEqual(result, mockData);
  });

  test('should handle empty data', async () => {
    block = new MockData({
      id: 'mock',
      config: { data: {} }
    });

    context = new Context();

    const result = await block.execute({}, context);

    assert.deepStrictEqual(result, {});
  });

  test('should handle null data', async () => {
    block = new MockData({
      id: 'mock',
      config: { data: null }
    });

    context = new Context();

    const result = await block.execute({}, context);

    // MockData returns {} when data is null (due to || {} fallback)
    assert.deepStrictEqual(result, {});
  });

  test('should handle array data', async () => {
    const arrayData = [1, 2, 3, { key: 'value' }];

    block = new MockData({
      id: 'mock',
      config: { data: arrayData }
    });

    context = new Context();

    const result = await block.execute({}, context);

    assert.deepStrictEqual(result, arrayData);
  });

  test('should handle string data', async () => {
    block = new MockData({
      id: 'mock',
      config: { data: 'test string' }
    });

    context = new Context();

    const result = await block.execute({}, context);

    assert.strictEqual(result, 'test string');
  });

  test('should handle number data', async () => {
    block = new MockData({
      id: 'mock',
      config: { data: 42 }
    });

    context = new Context();

    const result = await block.execute({}, context);

    assert.strictEqual(result, 42);
  });

  test('should handle boolean data', async () => {
    block = new MockData({
      id: 'mock',
      config: { data: true }
    });

    context = new Context();

    const result = await block.execute({}, context);

    assert.strictEqual(result, true);
  });

  test('should default to empty object when no config provided', async () => {
    block = new MockData({ id: 'mock' });

    context = new Context();

    const result = await block.execute({}, context);

    assert.deepStrictEqual(result, {});
  });

  test('should handle complex nested structures', async () => {
    const complexData = {
      users: [
        { id: 1, name: 'Alice', roles: ['admin'] },
        { id: 2, name: 'Bob', roles: ['user', 'editor'] }
      ],
      settings: {
        theme: 'dark',
        notifications: {
          email: true,
          push: false
        }
      },
      metadata: null
    };

    block = new MockData({
      id: 'mock',
      config: { data: complexData }
    });

    context = new Context();

    const result = await block.execute({}, context);

    assert.deepStrictEqual(result, complexData);
  });

  test('should return data by reference', async () => {
    const originalData = { key: 'value' };

    block = new MockData({
      id: 'mock',
      config: { data: originalData }
    });

    context = new Context();

    const result = await block.execute({}, context);

    // MockData returns the same reference, so modifications affect original
    result.key = 'modified';

    // Original is also modified since it's the same reference
    assert.strictEqual(originalData.key, 'modified');
  });
});
