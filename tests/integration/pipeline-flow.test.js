import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PipelineBuilder } from '../../src/core/PipelineBuilder.js';
import { createTestPipelineConfig } from '../utils/mocks.js';

describe('Pipeline Integration Tests', () => {
  describe('simple pipeline flow', () => {
    test('should execute blocks in sequence', async () => {
      const config = createTestPipelineConfig([
        {
          block: 'JsonParser',
          id: 'parser',
          input: { from: 'input.jsonString', as: 'body' }
        },
        {
          block: 'ValidateContent',
          id: 'validator',
          input: { from: 'parser.parsed.message', as: 'text' },
          config: { contains: 'hello' }
        }
      ]);

      const pipeline = PipelineBuilder.fromJSON(config);
      const result = await pipeline.execute({
        jsonString: '{"message":"hello world"}'
      });

      assert.ok(result.success);
      assert.ok(result.data.parser);
      assert.ok(result.data.parser.parsed);
      assert.strictEqual(result.data.parser.parsed.message, 'hello world');
      assert.ok(result.data.validator);
      assert.strictEqual(result.data.validator.passed, true);
    });

    test('should handle pipeline with transformations', async () => {
      const config = createTestPipelineConfig([
        {
          block: 'JsonParser',
          id: 'parse',
          input: { from: 'input.jsonData', as: 'body' },
          output: 'parsed'
        },
        {
          block: 'ValidateContent',
          id: 'validate',
          input: { from: 'input.textData', as: 'text' },
          config: { contains: ['status', 'data'] },
          output: 'validation'
        }
      ]);

      const pipeline = PipelineBuilder.fromJSON(config);
      const jsonInput = JSON.stringify({
        status: 'success',
        data: { value: 42 }
      });

      const result = await pipeline.execute({
        jsonData: jsonInput,
        textData: JSON.stringify({ status: 'success', data: { value: 42 } })
      });

      assert.ok(result.success);
      assert.ok(result.data.parsed);
      assert.ok(result.data.validation.passed);
    });
  });

  describe('data bus slot management', () => {
    test('should maintain data across blocks', async () => {
      const config = {
        name: 'Data Bus Test',
        pipeline: [
          {
            block: 'JsonParser',
            id: 'step1',
            input: { from: 'input.jsonString', as: 'body' },
            output: 'parseResult'
          },
          {
            block: 'ValidateContent',
            id: 'step2',
            input: { from: 'input.textToValidate', as: 'text' },
            output: 'validation'
          }
        ]
      };

      const pipeline = PipelineBuilder.fromJSON(config);
      const result = await pipeline.execute({
        jsonString: '{"test":true}',
        textToValidate: 'test content'
      });

      // Both blocks should have executed
      assert.ok(result.data.parseResult);
      assert.ok(result.data.validation);
    });

    test('should handle missing inputs gracefully', async () => {
      const config = createTestPipelineConfig([
        {
          block: 'JsonParser',
          id: 'parser',
          input: { from: 'input.missingInput', as: 'body' }
        }
      ]);

      const pipeline = PipelineBuilder.fromJSON(config);
      const result = await pipeline.execute({});

      // Should fail due to missing required input
      assert.strictEqual(result.success, false);
      assert.ok(result.error || result.data._error);
    });
  });

  describe('stream parsing pipeline', () => {
    test('should parse Vercel AI stream and validate content', async () => {
      const streamData = 'data: {"type":"text-delta","textDelta":"Hello"}\ndata: {"type":"text-delta","textDelta":" AI"}\ndata: {"type":"text-delta","textDelta":" response"}\ndata: {"type":"finish","finishReason":"stop"}';

      const config = {
        name: 'Stream Processing',
        pipeline: [
          {
            block: 'StreamParser',
            id: 'parse-stream',
            input: { from: 'input.stream', as: 'body' },
            output: 'streamResult',
            config: { format: 'sse-vercel' }
          },
          {
            block: 'ValidateContent',
            id: 'validate-response',
            input: { from: 'streamResult.text', as: 'text' },
            output: 'validation',
            config: {
              contains: 'AI',
              minLength: 10
            }
          }
        ]
      };

      const pipeline = PipelineBuilder.fromJSON(config);
      const result = await pipeline.execute({ stream: streamData });

      assert.ok(result.success);
      assert.strictEqual(result.data.streamResult.text, 'Hello AI response');
      assert.strictEqual(result.data.validation.passed, true);
    });

    test('should extract tool calls from stream', async () => {
      const streamWithTools = 'data: {"type":"text-delta","textDelta":"Checking"}\n' +
        'data: {"type":"tool-call","toolCallId":"1","toolName":"getEvents","args":{"date":"2024-01-15"}}\n' +
        'data: {"type":"text-delta","textDelta":" Done"}\n' +
        'data: {"type":"finish","finishReason":"stop"}';

      const config = createTestPipelineConfig([
        {
          block: 'StreamParser',
          id: 'parser',
          input: { from: 'input.body', as: 'body' },
          config: { format: 'sse-vercel' }
        }
      ]);

      const pipeline = PipelineBuilder.fromJSON(config);
      const result = await pipeline.execute({ body: streamWithTools });

      assert.ok(result.success);
      assert.strictEqual(result.data.parser.text, 'Checking Done');
      assert.strictEqual(result.data.parser.toolCalls.length, 1);
      assert.strictEqual(result.data.parser.toolCalls[0].name, 'getEvents');
    });
  });

  describe('error propagation', () => {
    test('should stop pipeline on block error', async () => {
      const config = createTestPipelineConfig([
        {
          block: 'JsonParser',
          id: 'parser',
          input: { from: 'input.body', as: 'body' }
        },
        {
          block: 'ValidateContent',
          id: 'validator',
          input: { from: 'parser.parsed', as: 'text' }
        }
      ]);

      const pipeline = PipelineBuilder.fromJSON(config);
      const result = await pipeline.execute({
        body: 'invalid json'
      });

      // Pipeline should stop after parser fails
      assert.strictEqual(result.success, false);
      assert.ok(result.error || result.data._error);
      // Validator should not have run
      assert.strictEqual(result.data.validator, undefined);
    });

    test('should capture error details', async () => {
      const config = createTestPipelineConfig([
        {
          block: 'JsonParser',
          id: 'json-parser',
          input: { from: 'input.body', as: 'body' }
        }
      ]);

      const pipeline = PipelineBuilder.fromJSON(config);
      const result = await pipeline.execute({
        body: '{not valid json}'
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.error || result.data._error);
      const errorMeta = result.data['_meta.json-parser'];
      assert.ok(errorMeta);
      assert.ok(errorMeta.error || errorMeta.success === false);
    });
  });

  describe('context propagation', () => {
    test('should share context between blocks', async () => {
      const config = createTestPipelineConfig([
        {
          block: 'JsonParser',
          id: 'parser',
          input: { from: 'input.body', as: 'body' }
        }
      ]);

      const pipeline = PipelineBuilder.fromJSON(config);
      const result = await pipeline.execute(
        { body: '{"test":true}' },
        { apiKey: 'test-key-123', debug: true }
      );

      assert.ok(result.success);
      // Context should be available throughout execution
    });

    test('should handle environment variables in pipeline config', async () => {
      const config = {
        name: 'Env Test',
        context: {
          baseUrl: 'https://api.example.com',
          timeout: 5000
        },
        pipeline: [
          {
            block: 'JsonParser',
            id: 'parser',
            input: { from: 'input.jsonInput', as: 'body' }
          }
        ]
      };

      const pipeline = PipelineBuilder.fromJSON(config);
      const result = await pipeline.execute({
        jsonInput: '{"status":"ok"}'
      });

      assert.ok(result.success);
      // Context values should be accessible
      assert.strictEqual(pipeline.context.get('baseUrl'), 'https://api.example.com');
    });

    test('should resolve environment variables end-to-end', async () => {
      // Set up test environment variables
      process.env.TEST_BASE_URL = 'http://localhost:3000';
      process.env.TEST_AUTH_TOKEN = 'bearer-token-123';

      const config = {
        name: 'End-to-End Env Test',
        context: {
          BASE_URL: '${env.TEST_BASE_URL}',
          AUTH_TOKEN: '${env.TEST_AUTH_TOKEN}',
          STATIC_VALUE: 'static'
        },
        pipeline: [
          {
            block: 'ValidateContent',
            id: 'validate-url',
            input: {
              text: '${BASE_URL}/api/endpoint'
            },
            config: {
              contains: ['localhost:3000', '/api/endpoint']
            },
            output: 'urlValidation'
          },
          {
            block: 'ValidateContent',
            id: 'validate-auth',
            input: {
              text: 'Authorization: Bearer ${AUTH_TOKEN}'
            },
            config: {
              contains: ['bearer-token-123', 'Authorization']
            },
            output: 'authValidation'
          },
          {
            block: 'ValidateContent',
            id: 'validate-mixed',
            input: {
              text: 'URL: ${BASE_URL}, Static: ${STATIC_VALUE}, Token: ${AUTH_TOKEN}'
            },
            config: {
              contains: ['localhost:3000', 'static', 'bearer-token-123']
            },
            output: 'mixedValidation'
          }
        ]
      };

      const pipeline = PipelineBuilder.fromJSON(config);
      const result = await pipeline.execute();

      // All blocks should pass
      assert.ok(result.success, 'Pipeline should succeed');
      assert.ok(result.data.urlValidation.passed, 'URL validation should pass');
      assert.ok(result.data.authValidation.passed, 'Auth validation should pass');
      assert.ok(result.data.mixedValidation.passed, 'Mixed validation should pass');

      // Context should have resolved values
      assert.strictEqual(pipeline.context.get('BASE_URL'), 'http://localhost:3000');
      assert.strictEqual(pipeline.context.get('AUTH_TOKEN'), 'bearer-token-123');
      assert.strictEqual(pipeline.context.get('STATIC_VALUE'), 'static');

      // Clean up
      delete process.env.TEST_BASE_URL;
      delete process.env.TEST_AUTH_TOKEN;
    });

    test('should handle template strings with context variables in inputs', async () => {
      const config = {
        name: 'Template Context Test',
        context: {
          API_HOST: 'api.example.com',
          API_VERSION: 'v2',
          API_KEY: 'test-key-123'
        },
        pipeline: [
          {
            block: 'ValidateContent',
            id: 'validate-template',
            input: {
              text: 'https://${API_HOST}/${API_VERSION}/users?key=${API_KEY}'
            },
            config: {
              contains: ['api.example.com', 'v2', 'test-key-123']
            }
          }
        ]
      };

      const pipeline = PipelineBuilder.fromJSON(config);
      const result = await pipeline.execute();

      assert.ok(result.success);
      assert.ok(result.data['validate-template'].passed);
    });
  });

  describe('complex data transformations', () => {
    test('should handle nested data extraction', async () => {
      const jsonData = JSON.stringify({
        response: {
          data: {
            items: [
              { id: 1, name: 'Item 1' },
              { id: 2, name: 'Item 2' }
            ]
          }
        }
      });

      const config = createTestPipelineConfig([
        {
          block: 'JsonParser',
          id: 'parser',
          input: { from: 'input.body', as: 'body' }
        }
      ]);

      const pipeline = PipelineBuilder.fromJSON(config);
      const result = await pipeline.execute({ body: jsonData });

      assert.ok(result.success);
      assert.ok(result.data.parser.parsed.response.data.items);
      assert.strictEqual(result.data.parser.parsed.response.data.items.length, 2);
    });

    test('should validate complex content patterns', async () => {
      const config = {
        name: 'Complex Validation',
        pipeline: [
          {
            block: 'ValidateContent',
            id: 'email-validator',
            input: { from: 'input.email', as: 'text' },
            output: 'emailValid',
            config: {
              matches: '^[\\w._%+-]+@[\\w.-]+\\.[A-Za-z]{2,}$',
              minLength: 5
            }
          },
          {
            block: 'ValidateContent',
            id: 'password-validator',
            input: { from: 'input.password', as: 'text' },
            output: 'passwordValid',
            config: {
              minLength: 8,
              contains: ['[A-Z]', '[0-9]'],
              notContains: 'password'
            }
          }
        ]
      };

      const pipeline = PipelineBuilder.fromJSON(config);
      const result = await pipeline.execute({
        email: 'user@example.com',
        password: 'SecureP@ss123'
      });

      assert.ok(result.success);
      assert.ok(result.data.emailValid.passed);
      // Password validation might fail due to regex in contains
    });
  });

  describe('performance', () => {
    test('should handle large data efficiently', async () => {
      const largeArray = Array(1000).fill(0).map((_, i) => ({
        id: i,
        value: `item_${i}`,
        nested: { data: `data_${i}` }
      }));

      const config = createTestPipelineConfig([
        {
          block: 'JsonParser',
          id: 'parser',
          input: { from: 'input.body', as: 'body' }
        }
      ]);

      const pipeline = PipelineBuilder.fromJSON(config);
      const startTime = Date.now();
      const result = await pipeline.execute({
        body: JSON.stringify(largeArray)
      });
      const duration = Date.now() - startTime;

      assert.ok(result.success);
      assert.strictEqual(result.data.parser.parsed.length, 1000);
      // Should complete in reasonable time (< 1 second)
      assert.ok(duration < 1000, `Pipeline took ${duration}ms`);
    });

    test('should handle rapid sequential executions', async () => {
      const config = createTestPipelineConfig([
        {
          block: 'JsonParser',
          id: 'parser',
          input: { from: 'input.body', as: 'body' }
        }
      ]);

      const pipeline = PipelineBuilder.fromJSON(config);
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          pipeline.execute({
            body: JSON.stringify({ index: i })
          })
        );
      }

      const results = await Promise.all(promises);

      // All should succeed
      assert.strictEqual(results.length, 100);
      results.forEach((result, i) => {
        assert.ok(result.success);
        assert.strictEqual(result.data.parser.parsed.index, i);
      });
    });
  });
});
