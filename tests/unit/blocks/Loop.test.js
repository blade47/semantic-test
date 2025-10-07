import { test, describe } from 'node:test';
import assert from 'node:assert';
import { Loop } from '../../../blocks/control/Loop.js';
import { LIMITS } from '../../../src/utils/constants.js';

describe('Loop', () => {
  let loop;

  describe('input/output definitions', () => {
    test('should have correct inputs', () => {
      const { inputs } = Loop;
      assert.deepStrictEqual(inputs.required, []);
      assert.deepStrictEqual(inputs.optional, ['*']);
    });

    test('should have correct outputs', () => {
      const { outputs } = Loop;
      assert.deepStrictEqual(outputs.produces, ['_loopTo', '_maxLoops', '_shouldLoop']);
    });
  });

  describe('loop signal generation', () => {
    test('should generate loop signal with target', () => {
      loop = new Loop({
        target: 'startBlock'
      });

      const result = loop.process({});

      assert.strictEqual(result._loopTo, 'startBlock');
      assert.strictEqual(result._maxLoops, LIMITS.MAX_LOOP_ITERATIONS);
    });

    test('should use custom max iterations', () => {
      loop = new Loop({
        target: 'myBlock',
        maxIterations: 10
      });

      const result = loop.process({});

      assert.strictEqual(result._loopTo, 'myBlock');
      assert.strictEqual(result._maxLoops, 10);
    });

    test('should pass through input data', () => {
      loop = new Loop({
        target: 'targetBlock'
      });

      const inputs = {
        data: 'test',
        count: 5,
        nested: { value: 42 }
      };

      const result = loop.process(inputs);

      assert.strictEqual(result.data, 'test');
      assert.strictEqual(result.count, 5);
      assert.deepStrictEqual(result.nested, { value: 42 });
      assert.strictEqual(result._loopTo, 'targetBlock');
    });

    test('should handle numeric target (block index)', () => {
      loop = new Loop({
        target: 0,
        maxIterations: 3
      });

      const result = loop.process({ value: 'data' });

      assert.strictEqual(result._loopTo, 0);
      assert.strictEqual(result._maxLoops, 3);
      assert.strictEqual(result.value, 'data');
    });

    test('should work with empty inputs', () => {
      loop = new Loop({
        target: 'block1'
      });

      const result = loop.process({});

      assert.strictEqual(result._loopTo, 'block1');
      assert.strictEqual(result._maxLoops, LIMITS.MAX_LOOP_ITERATIONS);
    });

    test('should work with undefined inputs', () => {
      loop = new Loop({
        target: 'block1'
      });

      const result = loop.process();

      assert.strictEqual(result._loopTo, 'block1');
      assert.strictEqual(result._maxLoops, LIMITS.MAX_LOOP_ITERATIONS);
    });
  });

  describe('configuration validation', () => {
    test('should handle missing config gracefully', () => {
      loop = new Loop({});

      const result = loop.process({ test: 'data' });

      assert.strictEqual(result._loopTo, undefined);
      assert.strictEqual(result._maxLoops, LIMITS.MAX_LOOP_ITERATIONS);
      assert.strictEqual(result.test, 'data');
    });

    test('should handle zero max iterations', () => {
      loop = new Loop({
        target: 'block1',
        maxIterations: 0
      });

      const result = loop.process({});

      assert.strictEqual(result._loopTo, 'block1');
      assert.strictEqual(result._maxLoops, 0);
    });

    test('should handle negative max iterations', () => {
      loop = new Loop({
        target: 'block1',
        maxIterations: -5
      });

      const result = loop.process({});

      assert.strictEqual(result._loopTo, 'block1');
      assert.strictEqual(result._maxLoops, -5);
    });
  });

  describe('conditional looping', () => {
    test('should loop when condition evaluates to true', () => {
      loop = new Loop({
        target: 'retry',
        maxIterations: 5,
        condition: {
          path: 'response.status',
          operator: 'notEquals',
          value: 200
        }
      });

      const inputs = {
        response: { status: 500 }
      };

      const result = loop.process(inputs);

      assert.strictEqual(result._shouldLoop, true);
      assert.strictEqual(result._loopTo, 'retry');
      assert.strictEqual(result._maxLoops, 5);
      assert.strictEqual(result.response.status, 500);
    });

    test('should not loop when condition evaluates to false', () => {
      loop = new Loop({
        target: 'retry',
        maxIterations: 5,
        condition: {
          path: 'response.status',
          operator: 'notEquals',
          value: 200
        }
      });

      const inputs = {
        response: { status: 200 }
      };

      const result = loop.process(inputs);

      assert.strictEqual(result._shouldLoop, false);
      assert.strictEqual(result._loopTo, undefined);
      assert.strictEqual(result._maxLoops, undefined);
      assert.strictEqual(result.response.status, 200);
    });

    test('should loop unconditionally when no condition provided', () => {
      loop = new Loop({
        target: 'block1',
        maxIterations: 3
      });

      const result = loop.process({ data: 'test' });

      assert.strictEqual(result._shouldLoop, true);
      assert.strictEqual(result._loopTo, 'block1');
      assert.strictEqual(result._maxLoops, 3);
    });

    test('should work with gt operator for threshold checking', () => {
      loop = new Loop({
        target: 'measure',
        maxIterations: 10,
        condition: {
          path: 'score',
          operator: 'lt',
          value: 0.8
        }
      });

      const result = loop.process({ score: 0.5 });

      assert.strictEqual(result._shouldLoop, true);
      assert.strictEqual(result._loopTo, 'measure');
    });

    test('should work with complex nested paths', () => {
      loop = new Loop({
        target: 'check',
        maxIterations: 5,
        condition: {
          path: 'job.status',
          operator: 'notEquals',
          value: 'completed'
        }
      });

      const result = loop.process({
        job: { status: 'pending', progress: 50 }
      });

      assert.strictEqual(result._shouldLoop, true);
      assert.strictEqual(result.job.status, 'pending');
    });

    test('should pass through all data when not looping', () => {
      loop = new Loop({
        target: 'start',
        condition: {
          path: 'done',
          operator: 'isFalse'
        }
      });

      const inputs = {
        done: true,
        data: { value: 42 },
        nested: { deep: { value: 'test' } }
      };

      const result = loop.process(inputs);

      assert.strictEqual(result._shouldLoop, false);
      assert.strictEqual(result.done, true);
      assert.deepStrictEqual(result.data, { value: 42 });
      assert.deepStrictEqual(result.nested, { deep: { value: 'test' } });
    });
  });

  describe('integration with pipeline', () => {
    test('should not modify special pipeline signals', () => {
      loop = new Loop({
        target: 'previousBlock',
        maxIterations: 5
      });

      const inputs = {
        data: 'test',
        _error: 'existing error',
        _terminate: false
      };

      const result = loop.process(inputs);

      // Should pass through existing special signals
      assert.strictEqual(result._error, 'existing error');
      assert.strictEqual(result._terminate, false);
      // And add loop signals
      assert.strictEqual(result._loopTo, 'previousBlock');
      assert.strictEqual(result._maxLoops, 5);
    });

    test('should work with complex nested data', () => {
      loop = new Loop({
        target: 'processBlock'
      });

      const complexInput = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ],
        metadata: {
          total: 2,
          page: 1,
          nested: {
            deep: {
              value: 'test'
            }
          }
        }
      };

      const result = loop.process(complexInput);

      assert.deepStrictEqual(result.users, complexInput.users);
      assert.deepStrictEqual(result.metadata, complexInput.metadata);
      assert.strictEqual(result._loopTo, 'processBlock');
    });
  });
});
