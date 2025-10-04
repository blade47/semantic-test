import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { HttpRequest } from '../../../blocks/http/HttpRequest.js';

describe('HttpRequest', () => {
  let httpRequest;
  let originalFetch;

  beforeEach(() => {
    httpRequest = new HttpRequest();
    // Save original fetch
    originalFetch = global.fetch;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  describe('input/output definitions', () => {
    test('should have correct inputs', () => {
      const { inputs } = HttpRequest;
      assert.deepStrictEqual(inputs.required, ['url', 'method']);
      assert.deepStrictEqual(inputs.optional, ['headers', 'body', 'timeout', 'query']);
    });

    test('should have correct outputs', () => {
      const { outputs } = HttpRequest;
      assert.deepStrictEqual(outputs.produces, ['status', 'headers', 'body', 'duration', 'url']);
    });
  });

  describe('successful requests', () => {
    test('should make successful GET request', async () => {
      // Mock fetch
      global.fetch = mock.fn(() => ({
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: () => JSON.stringify({ success: true })
      }));

      const result = await httpRequest.process({
        url: 'https://api.test.com/data',
        method: 'GET'
      });

      assert.strictEqual(result.status, 200);
      assert.ok(result.body);
      assert.ok(result.duration >= 0);
      assert.strictEqual(result.url, 'https://api.test.com/data');
      assert.strictEqual(global.fetch.mock.calls.length, 1);
    });

    test('should make POST request with JSON body', async () => {
      let capturedOptions;
      global.fetch = mock.fn((url, options) => {
        capturedOptions = options;
        return {
          status: 201,
          headers: new Map(),
          text: () => 'created'
        };
      });

      const result = await httpRequest.process({
        url: 'https://api.test.com/users',
        method: 'POST',
        body: { name: 'John', age: 30 }
      });

      assert.strictEqual(result.status, 201);
      assert.strictEqual(capturedOptions.method, 'POST');
      assert.strictEqual(capturedOptions.headers['Content-Type'], 'application/json');
      assert.strictEqual(capturedOptions.body, JSON.stringify({ name: 'John', age: 30 }));
    });

    test('should handle query parameters', async () => {
      let capturedUrl;
      global.fetch = mock.fn(url => {
        capturedUrl = url;
        return {
          status: 200,
          headers: new Map(),
          text: () => 'ok'
        };
      });

      await httpRequest.process({
        url: 'https://api.test.com/search',
        method: 'GET',
        query: {
          q: 'test query',
          limit: 10
        }
      });

      assert.ok(capturedUrl.includes('q=test+query'));
      assert.ok(capturedUrl.includes('limit=10'));
    });

    test('should pass custom headers', async () => {
      let capturedOptions;
      global.fetch = mock.fn((url, options) => {
        capturedOptions = options;
        return {
          status: 200,
          headers: new Map(),
          text: () => 'ok'
        };
      });

      await httpRequest.process({
        url: 'https://api.test.com/data',
        method: 'GET',
        headers: {
          Authorization: 'Bearer token123',
          'X-Custom': 'value'
        }
      });

      assert.strictEqual(capturedOptions.headers['Authorization'], 'Bearer token123');
      assert.strictEqual(capturedOptions.headers['X-Custom'], 'value');
    });

    test('should handle string body', async () => {
      let capturedOptions;
      global.fetch = mock.fn((url, options) => {
        capturedOptions = options;
        return {
          status: 200,
          headers: new Map(),
          text: () => 'ok'
        };
      });

      await httpRequest.process({
        url: 'https://api.test.com/data',
        method: 'POST',
        body: 'raw text data'
      });

      assert.strictEqual(capturedOptions.body, 'raw text data');
      assert.strictEqual(capturedOptions.headers['Content-Type'], undefined);
    });
  });

  describe('error handling', () => {
    test('should handle network errors', async () => {
      global.fetch = mock.fn(() => {
        throw new Error('Network error');
      });

      const result = await httpRequest.process({
        url: 'https://api.test.com/data',
        method: 'GET'
      });

      assert.ok(result.error);
      assert.strictEqual(result.error, 'Network error');
      assert.strictEqual(result.status, 0);
      assert.ok(result.duration >= 0);
    });

    test('should handle timeout with AbortSignal', async () => {
      let capturedOptions;
      global.fetch = mock.fn((url, options) => {
        capturedOptions = options;
        // Simulate timeout
        if (options.signal) {
          const error = new Error('Request timeout');
          error.name = 'AbortError';
          throw error;
        }
        return {
          status: 200,
          headers: new Map(),
          text: () => 'ok'
        };
      });

      const result = await httpRequest.process({
        url: 'https://api.test.com/slow',
        method: 'GET',
        timeout: 100
      });

      assert.ok(result.error);
      assert.ok(capturedOptions.signal);
      assert.ok(capturedOptions.signal instanceof AbortSignal);
    });

    test('should handle 404 responses', async () => {
      global.fetch = mock.fn(() => ({
        status: 404,
        headers: new Map([['content-type', 'text/plain']]),
        text: () => 'Not Found'
      }));

      const result = await httpRequest.process({
        url: 'https://api.test.com/missing',
        method: 'GET'
      });

      assert.strictEqual(result.status, 404);
      assert.strictEqual(result.body, 'Not Found');
      assert.strictEqual(result.error, undefined); // HTTP errors are not thrown
    });

    test('should handle malformed URL', async () => {
      const result = await httpRequest.process({
        url: 'not-a-valid-url',
        method: 'GET'
      });

      assert.ok(result.error);
      assert.strictEqual(result.status, 0);
    });
  });

  describe('native fetch verification', () => {
    test('should use native global fetch, not node-fetch', async () => {
      // This test verifies we're using native fetch
      // If node-fetch was imported, this would fail
      global.fetch = mock.fn(() => ({
        status: 200,
        headers: new Map(),
        text: () => 'ok'
      }));

      await httpRequest.process({
        url: 'https://api.test.com/test',
        method: 'GET'
      });

      // Verify our mock was called, proving we're using global.fetch
      assert.strictEqual(global.fetch.mock.calls.length, 1);
    });
  });

  describe('response processing', () => {
    test('should convert headers to plain object', async () => {
      const responseHeaders = new Map([
        ['content-type', 'application/json'],
        ['x-request-id', '12345']
      ]);

      global.fetch = mock.fn(() => ({
        status: 200,
        headers: responseHeaders,
        text: () => 'ok'
      }));

      const result = await httpRequest.process({
        url: 'https://api.test.com/test',
        method: 'GET'
      });

      assert.deepStrictEqual(result.headers, {
        'content-type': 'application/json',
        'x-request-id': '12345'
      });
    });

    test('should return response body as text', async () => {
      global.fetch = mock.fn(() => ({
        status: 200,
        headers: new Map(),
        text: () => JSON.stringify({ data: [1, 2, 3] })
      }));

      const result = await httpRequest.process({
        url: 'https://api.test.com/test',
        method: 'GET'
      });

      // Body should be text, not parsed JSON
      assert.strictEqual(typeof result.body, 'string');
      assert.strictEqual(result.body, '{"data":[1,2,3]}');
    });
  });
});
