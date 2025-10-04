import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Block } from '../../../src/core/Block.js';
import { Context } from '../../../src/core/Context.js';

// Create test block classes
class TestBlock extends Block {
  static get inputs() {
    return {
      required: ['input1', 'input2'],
      optional: ['input3']
    };
  }

  static get outputs() {
    return {
      produces: ['output1', 'output2']
    };
  }

  process(inputs, _context) {
    return {
      output1: inputs.input1 + inputs.input2,
      output2: inputs.input3 || 'default'
    };
  }
}

class AsyncTestBlock extends Block {
  static get inputs() {
    return {
      required: ['value'],
      optional: []
    };
  }

  static get outputs() {
    return {
      produces: ['result']
    };
  }

  async process(inputs, _context) {
    await new Promise(resolve => setTimeout(resolve, 10));
    return {
      result: inputs.value * 2
    };
  }
}

class NoRequirementsBlock extends Block {
  static get inputs() {
    return {
      required: [],
      optional: ['*']
    };
  }

  static get outputs() {
    return {
      produces: ['*']
    };
  }

  process(inputs, _context) {
    return inputs;
  }
}

describe('Block', () => {
  describe('constructor', () => {
    test('should initialize with config', () => {
      const config = { id: 'test-block', param1: 'value1' };
      const block = new TestBlock(config);

      assert.deepStrictEqual(block.config, config);
      assert.strictEqual(block.id, 'test-block');
    });

    test('should use class name as default id', () => {
      const block = new TestBlock();
      assert.strictEqual(block.id, 'TestBlock');
    });

    test('should handle empty config', () => {
      const block = new TestBlock({});
      assert.deepStrictEqual(block.config, {});
      assert.strictEqual(block.id, 'TestBlock');
    });
  });

  describe('input/output definitions', () => {
    test('should define inputs correctly', () => {
      const { inputs } = TestBlock;
      assert.deepStrictEqual(inputs.required, ['input1', 'input2']);
      assert.deepStrictEqual(inputs.optional, ['input3']);
    });

    test('should define outputs correctly', () => {
      const { outputs } = TestBlock;
      assert.deepStrictEqual(outputs.produces, ['output1', 'output2']);
    });

    test('should handle blocks with no requirements', () => {
      const { inputs } = NoRequirementsBlock;
      assert.deepStrictEqual(inputs.required, []);
      assert.deepStrictEqual(inputs.optional, ['*']);
    });
  });

  describe('validateInputs', () => {
    let block;

    beforeEach(() => {
      block = new TestBlock();
    });

    test('should pass validation with all required inputs', () => {
      assert.doesNotThrow(() => {
        block.validateInputs({ input1: 'a', input2: 'b' });
      });
    });

    test('should pass validation with required and optional inputs', () => {
      assert.doesNotThrow(() => {
        block.validateInputs({ input1: 'a', input2: 'b', input3: 'c' });
      });
    });

    test('should throw error for missing required inputs', () => {
      assert.throws(
        () => block.validateInputs({ input1: 'a' }),
        /missing required inputs.*input2/i
      );
    });

    test('should throw error for all missing required inputs', () => {
      assert.throws(
        () => block.validateInputs({}),
        /missing required inputs.*input1.*input2/i
      );
    });

    test('should handle undefined inputs', () => {
      assert.throws(
        () => block.validateInputs(undefined),
        /missing required inputs/i
      );
    });

    test('should handle null inputs', () => {
      assert.throws(
        () => block.validateInputs(null),
        /missing required inputs/i
      );
    });

    test('should not require optional inputs', () => {
      assert.doesNotThrow(() => {
        block.validateInputs({ input1: 'a', input2: 'b' });
      });
    });

    test('should handle blocks with no requirements', () => {
      const noReqBlock = new NoRequirementsBlock();
      assert.doesNotThrow(() => {
        noReqBlock.validateInputs({});
        noReqBlock.validateInputs(undefined);
        noReqBlock.validateInputs(null);
      });
    });
  });

  describe('execute', () => {
    test('should validate inputs and call process', () => {
      const block = new TestBlock();
      const context = new Context();
      const result = block.execute(
        { input1: 'hello', input2: 'world' },
        context
      );

      assert.deepStrictEqual(result, {
        output1: 'helloworld',
        output2: 'default'
      });
    });

    test('should handle async process methods', async () => {
      const block = new AsyncTestBlock();
      const context = new Context();
      const result = await block.execute({ value: 21 }, context);

      assert.deepStrictEqual(result, { result: 42 });
    });

    test('should throw if validation fails', () => {
      const block = new TestBlock();
      const context = new Context();

      assert.throws(
        () => block.execute({ input1: 'only one' }, context),
        /missing required inputs/i
      );
    });

    test('should pass context to process method', () => {
      let capturedContext = null;

      class ContextCaptureBlock extends Block {
        static get inputs() {
          return { required: [], optional: [] };
        }

        process(inputs, context) {
          capturedContext = context;
          return {};
        }
      }

      const block = new ContextCaptureBlock();
      const context = new Context();
      context.set('testValue', 'captured');

      block.execute({}, context);

      assert.strictEqual(capturedContext, context);
      assert.strictEqual(capturedContext.get('testValue'), 'captured');
    });
  });

  describe('error handling', () => {
    test('should throw if process method not implemented', () => {
      class UnimplementedBlock extends Block {
        static get inputs() {
          return { required: [], optional: [] };
        }
      }

      const block = new UnimplementedBlock();
      const context = new Context();

      assert.throws(
        () => block.execute({}, context),
        /must implement process method/i
      );
    });

    test('should propagate errors from process method', () => {
      class ErrorBlock extends Block {
        static get inputs() {
          return { required: [], optional: [] };
        }

        process(_inputs, _context) {
          throw new Error('Process failed');
        }
      }

      const block = new ErrorBlock();
      const context = new Context();

      assert.throws(
        () => block.execute({}, context),
        /Process failed/
      );
    });

    test('should propagate async errors from process method', async () => {
      class AsyncErrorBlock extends Block {
        static get inputs() {
          return { required: [], optional: [] };
        }

        async process(_inputs, _context) {
          await new Promise(resolve => setTimeout(resolve, 10));
          throw new Error('Async process failed');
        }
      }

      const block = new AsyncErrorBlock();
      const context = new Context();

      await assert.rejects(
        () => block.execute({}, context),
        /Async process failed/
      );
    });
  });

  describe('custom block implementations', () => {
    test('should support blocks with variable inputs', () => {
      class VariableInputBlock extends Block {
        static get inputs() {
          return { required: [], optional: ['*'] };
        }

        process(inputs, _context) {
          return { count: Object.keys(inputs).length };
        }
      }

      const block = new VariableInputBlock();
      const context = new Context();

      const result1 = block.execute({}, context);
      assert.strictEqual(result1.count, 0);

      const result2 = block.execute({ a: 1, b: 2, c: 3 }, context);
      assert.strictEqual(result2.count, 3);
    });

    test('should support blocks with variable outputs', () => {
      class VariableOutputBlock extends Block {
        static get inputs() {
          return { required: ['data'], optional: [] };
        }

        static get outputs() {
          return { produces: ['*'] };
        }

        process(inputs, _context) {
          return inputs.data;
        }
      }

      const block = new VariableOutputBlock();
      const context = new Context();

      const result = block.execute(
        { data: { custom1: 'a', custom2: 'b' } },
        context
      );

      assert.deepStrictEqual(result, { custom1: 'a', custom2: 'b' });
    });
  });
});
