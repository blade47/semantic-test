import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Pipeline } from '../../../src/core/Pipeline.js';
import { Block } from '../../../src/core/Block.js';

// Create a simple test block
class TestBlock extends Block {
  static get inputs() {
    return { required: [], optional: ['*'] };
  }

  static get outputs() {
    return { produces: ['result'] };
  }

  process(inputs) {
    return { result: inputs.value || 'test' };
  }
}

// Create a block that throws errors
class ErrorBlock extends Block {
  process() {
    throw new Error('Test error');
  }
}

describe('Pipeline', () => {
  let pipeline;

  beforeEach(() => {
    pipeline = new Pipeline();
  });

  describe('executeBlock()', () => {
    test('should execute a block successfully', async () => {
      const block = new TestBlock({ id: 'test' });
      pipeline.blocks = [block];

      const result = await pipeline.executeBlock(block, 0);

      assert.ok(result.result);
      assert.strictEqual(result.result.result, 'test');
      assert.ok(typeof result.duration === 'number');
      assert.strictEqual(result.error, undefined);
    });

    test('should handle block execution errors', async () => {
      const block = new ErrorBlock({ id: 'error' });
      pipeline.blocks = [block];

      const result = await pipeline.executeBlock(block, 0);

      assert.ok(result.error);
      assert.strictEqual(result.error.message, 'Test error');
      assert.ok(typeof result.duration === 'number');
    });
  });

  describe('handleBlockSuccess()', () => {
    test('should store output and update summary', () => {
      const block = new TestBlock({ id: 'test' });
      const output = { result: 'success' };

      pipeline.executionSummary = {
        executed: 0,
        succeeded: 0,
        totalDuration: 0,
        hasErrors: false,
        blockResults: []
      };

      pipeline.handleBlockSuccess(block, output, 100);

      // Check output was stored
      assert.deepStrictEqual(pipeline.dataBus.get('test'), output);

      // Check metadata was stored
      const metadata = pipeline.dataBus.get('_meta.test');
      assert.ok(metadata);
      assert.strictEqual(metadata.success, true);
      assert.strictEqual(metadata.duration, 100);

      // Check summary was updated
      assert.strictEqual(pipeline.executionSummary.executed, 1);
      assert.strictEqual(pipeline.executionSummary.succeeded, 1);
      assert.strictEqual(pipeline.executionSummary.totalDuration, 100);
    });
  });

  describe('checkFlowControl()', () => {
    test('should detect termination signal', () => {
      // Set up blocks array for the test
      pipeline.blocks = [
        new TestBlock({ id: 'terminator' })
      ];

      const output = { _terminate: true };
      const result = pipeline.checkFlowControl(output, 0);

      assert.strictEqual(result.action, 'break');
    });

    test('should detect loop signal', () => {
      const output = { _loopTo: 'target', _maxLoops: 5 };
      pipeline.blocks = [
        new TestBlock({ id: 'target' }),
        new TestBlock({ id: 'current' })
      ];

      const result = pipeline.checkFlowControl(output, 1);

      assert.strictEqual(result.action, 'loop');
      assert.strictEqual(result.newIndex, -1); // Will be incremented by loop
    });

    test('should return continue for normal output', () => {
      const output = { result: 'data' };
      const result = pipeline.checkFlowControl(output, 0);

      assert.strictEqual(result.action, 'continue');
    });
  });

  describe('resolveValue()', () => {
    test('should resolve variable references', () => {
      pipeline.dataBus.set('user.name', 'John');

      const result = pipeline.resolveValue('${user.name}');
      assert.strictEqual(result, 'John');
    });

    test('should handle falsy values correctly', () => {
      pipeline.dataBus.set('count', 0);
      pipeline.dataBus.set('empty', '');
      pipeline.dataBus.set('bool', false);

      assert.strictEqual(pipeline.resolveValue('${count}'), 0);
      assert.strictEqual(pipeline.resolveValue('${empty}'), '');
      assert.strictEqual(pipeline.resolveValue('${bool}'), false);
    });

    test('should handle undefined values', () => {
      const result = pipeline.resolveValue('${missing.value}');
      assert.strictEqual(result, undefined);
    });

    test('should resolve environment variables from context', () => {
      pipeline.context.set('apiKey', 'secret123');

      const result = pipeline.resolveValue('${env.apiKey}');
      assert.strictEqual(result, 'secret123');
    });

    test('should handle template strings with multiple variables', () => {
      pipeline.dataBus.set('first', 'Hello');
      pipeline.dataBus.set('last', 'World');

      const result = pipeline.resolveValue('${first} ${last}!');
      assert.strictEqual(result, 'Hello World!');
    });

    test('should resolve context variables in single references', () => {
      pipeline.context.set('BASE_URL', 'https://api.example.com');
      pipeline.context.set('API_KEY', 'key123');
      pipeline.context.set('TIMEOUT', 5000);

      assert.strictEqual(pipeline.resolveValue('${BASE_URL}'), 'https://api.example.com');
      assert.strictEqual(pipeline.resolveValue('${API_KEY}'), 'key123');
      assert.strictEqual(pipeline.resolveValue('${TIMEOUT}'), 5000);
    });

    test('should prioritize context over dataBus for variable resolution', () => {
      // Set same key in both context and dataBus
      pipeline.context.set('value', 'from-context');
      pipeline.dataBus.set('value', 'from-databus');

      // Context should take precedence
      assert.strictEqual(pipeline.resolveValue('${value}'), 'from-context');

      // Remove from context, should fall back to dataBus
      pipeline.context.delete('value');
      assert.strictEqual(pipeline.resolveValue('${value}'), 'from-databus');
    });

    test('should resolve context variables in template strings', () => {
      // Set up context variables
      pipeline.context.set('BASE_URL', 'https://api.example.com');
      pipeline.context.set('VERSION', 'v2');
      // Set up dataBus variable
      pipeline.dataBus.set('endpoint', 'users');

      // Test mixing context and dataBus variables
      const result = pipeline.resolveValue('${BASE_URL}/${VERSION}/${endpoint}');
      assert.strictEqual(result, 'https://api.example.com/v2/users');
    });

    test('should handle complex templates with context and env variables', () => {
      pipeline.context.set('API_KEY', 'secret123');
      pipeline.context.set('HOST', 'api.example.com');
      pipeline.dataBus.set('userId', '42');

      const template = 'https://${HOST}/users/${userId}?key=${API_KEY}';
      const result = pipeline.resolveValue(template);
      assert.strictEqual(result, 'https://api.example.com/users/42?key=secret123');
    });

    test('should handle undefined context variables gracefully', () => {
      // Variable not in context or dataBus
      const result = pipeline.resolveValue('${UNDEFINED_VAR}');
      assert.strictEqual(result, undefined);

      // In template, should keep original placeholder
      const template = 'prefix-${UNDEFINED_VAR}-suffix';
      const templateResult = pipeline.resolveValue(template);
      assert.strictEqual(templateResult, 'prefix-${UNDEFINED_VAR}-suffix');
    });
  });

  describe('handleLoop()', () => {
    test('should use per-target loop counters', () => {
      pipeline.blocks = [
        new TestBlock({ id: 'target1' }),
        new TestBlock({ id: 'target2' }),
        new TestBlock({ id: 'current' })
      ];

      // First loop to target1
      const index1 = pipeline.handleLoop('target1', 2, 5);
      assert.strictEqual(index1, -1);
      assert.strictEqual(pipeline.context.get('_loopCount:target1'), 1);

      // First loop to target2 (different counter)
      const index2 = pipeline.handleLoop('target2', 2, 5);
      assert.strictEqual(index2, 0);
      assert.strictEqual(pipeline.context.get('_loopCount:target2'), 1);

      // Second loop to target1
      const index3 = pipeline.handleLoop('target1', 2, 5);
      assert.strictEqual(index3, -1);
      assert.strictEqual(pipeline.context.get('_loopCount:target1'), 2);
    });

    test('should respect max loop iterations', () => {
      pipeline.blocks = [
        new TestBlock({ id: 'target' }),
        new TestBlock({ id: 'current' })
      ];

      // Set loop count to max
      pipeline.context.set('_loopCount:target', 3);

      const result = pipeline.handleLoop('target', 1, 3);
      assert.strictEqual(result, null); // Loop limit reached
    });
  });

  describe('gatherInputs()', () => {
    test('should handle string format input', () => {
      const block = new TestBlock({
        id: 'test',
        input: '${response.body}'
      });

      pipeline.dataBus.set('response.body', 'test data');
      const inputs = pipeline.gatherInputs(block);

      assert.deepStrictEqual(inputs, { body: 'test data' });
    });

    test('should handle object with from/as format', () => {
      const block = new TestBlock({
        id: 'test',
        input: { from: 'user.name', as: 'username' }
      });

      pipeline.dataBus.set('user.name', 'John');
      const inputs = pipeline.gatherInputs(block);

      assert.deepStrictEqual(inputs, { username: 'John' });
    });

    test('should handle direct object format', () => {
      const block = new TestBlock({
        id: 'test',
        input: {
          url: 'https://api.test.com',
          method: 'GET'
        }
      });

      const inputs = pipeline.gatherInputs(block);

      assert.deepStrictEqual(inputs, {
        url: 'https://api.test.com',
        method: 'GET'
      });
    });

    test('should return entire data bus when no input specified', () => {
      const block = new TestBlock({ id: 'test' });

      pipeline.dataBus.set('key1', 'value1');
      pipeline.dataBus.set('key2', 'value2');

      const inputs = pipeline.gatherInputs(block);

      assert.deepStrictEqual(inputs, {
        key1: 'value1',
        key2: 'value2'
      });
    });
  });

  describe('storeOutput()', () => {
    test('should handle string format output', () => {
      const block = new TestBlock({
        id: 'test',
        output: 'result'
      });

      const output = { data: 'test' };
      pipeline.storeOutput(block, output);

      assert.deepStrictEqual(pipeline.dataBus.get('result'), output);
    });

    test('should handle object mapping format', () => {
      const block = new TestBlock({
        id: 'test',
        output: {
          parsed: 'data',
          error: 'parseError'
        }
      });

      const output = {
        parsed: { value: 42 },
        error: null,
        extra: 'ignored'
      };

      pipeline.storeOutput(block, output);

      assert.deepStrictEqual(pipeline.dataBus.get('data'), { value: 42 });
      assert.strictEqual(pipeline.dataBus.get('parseError'), null);
      assert.strictEqual(pipeline.dataBus.get('extra'), undefined);
    });

    test('should use block ID when no output specified', () => {
      const block = new TestBlock({ id: 'myblock' });

      const output = { result: 'data' };
      pipeline.storeOutput(block, output);

      assert.deepStrictEqual(pipeline.dataBus.get('myblock'), output);
    });
  });

  describe('execute()', () => {
    test('should execute pipeline successfully', async () => {
      const block1 = new TestBlock({ id: 'block1', output: 'step1' });
      const block2 = new TestBlock({
        id: 'block2',
        input: { from: 'step1.result', as: 'value' }
      });

      pipeline.blocks = [block1, block2];

      const result = await pipeline.execute();

      assert.ok(result.success);
      assert.ok(result.data.step1);
      assert.ok(result.data.block2);
      assert.strictEqual(result.data.step1.result, 'test');
      assert.strictEqual(result.data.block2.result, 'test');
    });

    test('should handle errors and stop execution', async () => {
      const block1 = new TestBlock({ id: 'block1' });
      const block2 = new ErrorBlock({ id: 'block2' });
      const block3 = new TestBlock({ id: 'block3' });

      pipeline.blocks = [block1, block2, block3];

      const result = await pipeline.execute();

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.data.block1); // First block executed
      assert.strictEqual(result.data.block3, undefined); // Third block not executed
    });
  });
});
