import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PipelineBuilder } from '../../../src/core/PipelineBuilder.js';
import { blockRegistry } from '../../../src/core/BlockRegistry.js';

describe('PipelineBuilder', () => {
  describe('fromJSON()', () => {
    test('should build pipeline from JSON object', () => {
      const config = {
        name: 'Test Pipeline',
        pipeline: [
          {
            block: 'JsonParser',
            id: 'parser',
            input: '${input.body}'
          },
          {
            block: 'ValidateContent',
            id: 'validator',
            input: { from: 'parser.parsed', as: 'text' }
          }
        ]
      };

      const pipeline = PipelineBuilder.fromJSON(config);

      assert.ok(pipeline);
      assert.strictEqual(pipeline.blocks.length, 2);
      assert.strictEqual(pipeline.blocks[0].id, 'parser');
      assert.strictEqual(pipeline.blocks[1].id, 'validator');
    });

    test('should parse JSON string', () => {
      const configString = JSON.stringify({
        name: 'String Pipeline',
        pipeline: [
          {
            block: 'JsonParser',
            id: 'parser'
          }
        ]
      });

      const pipeline = PipelineBuilder.fromJSON(configString);

      assert.ok(pipeline);
      assert.strictEqual(pipeline.blocks.length, 1);
    });

    test('should initialize context from config', () => {
      const config = {
        name: 'Context Test',
        context: {
          apiKey: 'test-key',
          baseUrl: 'https://api.test.com',
          timeout: 5000
        },
        pipeline: []
      };

      const pipeline = PipelineBuilder.fromJSON(config);

      assert.strictEqual(pipeline.context.get('apiKey'), 'test-key');
      assert.strictEqual(pipeline.context.get('baseUrl'), 'https://api.test.com');
      assert.strictEqual(pipeline.context.get('timeout'), 5000);
    });

    test('should store test metadata in context', () => {
      const config = {
        name: 'Metadata Test',
        version: '1.0.0',
        input: { testData: 'value' },
        output: 'result',
        assertions: { 'result.success': true },
        pipeline: []
      };

      const pipeline = PipelineBuilder.fromJSON(config);
      const metadata = pipeline.context.get('_test');

      assert.ok(metadata);
      assert.strictEqual(metadata.name, 'Metadata Test');
      assert.strictEqual(metadata.version, '1.0.0');
      assert.deepStrictEqual(metadata.input, { testData: 'value' });
      assert.strictEqual(metadata.output, 'result');
      assert.deepStrictEqual(metadata.assertions, { 'result.success': true });
    });

    test('should resolve environment variables in context', () => {
      // Set up test environment variables
      process.env.TEST_API_KEY = 'secret123';
      process.env.TEST_BASE_URL = 'https://test.example.com';

      const config = {
        name: 'Env Resolution Test',
        context: {
          apiKey: '${env.TEST_API_KEY}',
          baseUrl: '${env.TEST_BASE_URL}',
          timeout: 5000,
          static: 'not-env-var'
        },
        pipeline: []
      };

      const pipeline = PipelineBuilder.fromJSON(config);

      // Verify environment variables were resolved
      assert.strictEqual(pipeline.context.get('apiKey'), 'secret123');
      assert.strictEqual(pipeline.context.get('baseUrl'), 'https://test.example.com');
      // Non-env values should remain unchanged
      assert.strictEqual(pipeline.context.get('timeout'), 5000);
      assert.strictEqual(pipeline.context.get('static'), 'not-env-var');

      // Clean up
      delete process.env.TEST_API_KEY;
      delete process.env.TEST_BASE_URL;
    });

    test('should handle missing environment variables gracefully', () => {
      // Ensure the env var doesn't exist
      delete process.env.DOES_NOT_EXIST;

      const config = {
        name: 'Missing Env Test',
        context: {
          missing: '${env.DOES_NOT_EXIST}',
          partial: 'prefix-${env.DOES_NOT_EXIST}-suffix'
        },
        pipeline: []
      };

      const pipeline = PipelineBuilder.fromJSON(config);

      // Should keep the original template when env var is missing
      assert.strictEqual(pipeline.context.get('missing'), '${env.DOES_NOT_EXIST}');
      assert.strictEqual(pipeline.context.get('partial'), 'prefix-${env.DOES_NOT_EXIST}-suffix');
    });

    test('should resolve multiple environment variables in one value', () => {
      process.env.TEST_HOST = 'localhost';
      process.env.TEST_PORT = '3000';

      const config = {
        name: 'Multiple Env Test',
        context: {
          url: 'http://${env.TEST_HOST}:${env.TEST_PORT}/api'
        },
        pipeline: []
      };

      const pipeline = PipelineBuilder.fromJSON(config);

      assert.strictEqual(pipeline.context.get('url'), 'http://localhost:3000/api');

      // Clean up
      delete process.env.TEST_HOST;
      delete process.env.TEST_PORT;
    });

    test('should handle empty pipeline', () => {
      const config = {
        name: 'Empty Pipeline',
        pipeline: []
      };

      const pipeline = PipelineBuilder.fromJSON(config);

      assert.ok(pipeline);
      assert.strictEqual(pipeline.blocks.length, 0);
    });
  });

  describe('addBlock()', () => {
    test('should add block to pipeline', () => {
      const builder = new PipelineBuilder();

      builder.addBlock({
        block: 'JsonParser',
        id: 'parser'
      });

      assert.strictEqual(builder.blocks.length, 1);
      assert.strictEqual(builder.blocks[0].id, 'parser');
    });

    test('should use block name as ID if not specified', () => {
      const builder = new PipelineBuilder();

      builder.addBlock({
        block: 'JsonParser'
      });

      assert.strictEqual(builder.blocks[0].id, 'JsonParser');
    });

    test('should chain addBlock calls', () => {
      const builder = new PipelineBuilder();

      const result = builder
        .addBlock({ block: 'JsonParser', id: 'parser' })
        .addBlock({ block: 'ValidateContent', id: 'validator' });

      assert.strictEqual(result, builder);
      assert.strictEqual(builder.blocks.length, 2);
    });

    test('should pass block configuration', () => {
      const builder = new PipelineBuilder();

      builder.addBlock({
        block: 'ValidateContent',
        id: 'validator',
        input: '${data}',
        output: 'validation',
        minLength: 10,
        contains: 'test'
      });

      const block = builder.blocks[0];
      assert.strictEqual(block.config.minLength, 10);
      assert.strictEqual(block.config.contains, 'test');
    });

    test('should throw error for unknown block type', () => {
      const builder = new PipelineBuilder();

      assert.throws(
        () => {
          builder.addBlock({
            block: 'UnknownBlock',
            id: 'unknown'
          });
        },
        /Unknown block type: UnknownBlock/
      );
    });
  });

  describe('build()', () => {
    test('should create Pipeline instance', () => {
      const builder = new PipelineBuilder();

      builder.addBlock({ block: 'JsonParser', id: 'parser' });
      const pipeline = builder.build();

      assert.ok(pipeline);
      assert.strictEqual(pipeline.blocks.length, 1);
      assert.strictEqual(pipeline.blocks[0].id, 'parser');
    });

    test('should preserve block order', () => {
      const builder = new PipelineBuilder();

      builder
        .addBlock({ block: 'HttpRequest', id: 'request' })
        .addBlock({ block: 'JsonParser', id: 'parser' })
        .addBlock({ block: 'ValidateContent', id: 'validator' });

      const pipeline = builder.build();

      assert.strictEqual(pipeline.blocks[0].id, 'request');
      assert.strictEqual(pipeline.blocks[1].id, 'parser');
      assert.strictEqual(pipeline.blocks[2].id, 'validator');
    });
  });

  describe('integration with BlockRegistry', () => {
    test('should use registered blocks', () => {
      const config = {
        pipeline: [
          { block: 'JsonParser', id: 'parser' },
          { block: 'ValidateContent', id: 'validator' },
          { block: 'HttpRequest', id: 'request' },
          { block: 'Loop', id: 'loop' }
        ]
      };

      const pipeline = PipelineBuilder.fromJSON(config);

      assert.strictEqual(pipeline.blocks.length, 4);
      // Verify correct block types were instantiated
      assert.ok(pipeline.blocks[0].constructor.name.includes('JsonParser'));
      assert.ok(pipeline.blocks[1].constructor.name.includes('ValidateContent'));
      assert.ok(pipeline.blocks[2].constructor.name.includes('HttpRequest'));
      assert.ok(pipeline.blocks[3].constructor.name.includes('Loop'));
    });

    test('should list all available blocks', () => {
      const availableBlocks = blockRegistry.list();

      assert.ok(availableBlocks.includes('JsonParser'));
      assert.ok(availableBlocks.includes('ValidateContent'));
      assert.ok(availableBlocks.includes('HttpRequest'));
      assert.ok(availableBlocks.includes('StreamParser'));
      assert.ok(availableBlocks.includes('ValidateTools'));
      assert.ok(availableBlocks.includes('LLMJudge'));
      assert.ok(availableBlocks.includes('Loop'));
    });
  });
});
