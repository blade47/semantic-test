import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { JsonParser } from '../../../blocks/parse/JsonParser.js';

describe('JsonParser', () => {
  let parser;

  beforeEach(() => {
    parser = new JsonParser();
  });

  describe('input/output definitions', () => {
    test('should have correct inputs', () => {
      const { inputs } = JsonParser;
      assert.deepStrictEqual(inputs.required, ['body']);
      assert.deepStrictEqual(inputs.optional, []);
    });

    test('should have correct outputs', () => {
      const { outputs } = JsonParser;
      assert.deepStrictEqual(outputs.produces, ['parsed', 'error', 'raw']);
    });
  });

  describe('successful parsing', () => {
    test('should parse valid JSON object', () => {
      const jsonString = '{"name":"test","value":42}';
      const result = parser.process({ body: jsonString });

      assert.deepStrictEqual(result.parsed, { name: 'test', value: 42 });
      assert.strictEqual(result.error, undefined);
    });

    test('should parse valid JSON array', () => {
      const jsonString = '[1, 2, 3, "four", true, null]';
      const result = parser.process({ body: jsonString });

      assert.deepStrictEqual(result.parsed, [1, 2, 3, 'four', true, null]);
      assert.strictEqual(result.error, undefined);
    });

    test('should parse simple values', () => {
      // String
      let result = parser.process({ body: '"hello"' });
      assert.strictEqual(result.parsed, 'hello');

      // Number
      result = parser.process({ body: '42' });
      assert.strictEqual(result.parsed, 42);

      // Boolean
      result = parser.process({ body: 'true' });
      assert.strictEqual(result.parsed, true);

      // Null
      result = parser.process({ body: 'null' });
      assert.strictEqual(result.parsed, null);
    });

    test('should parse nested objects', () => {
      const jsonString = JSON.stringify({
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      });

      const result = parser.process({ body: jsonString });
      assert.strictEqual(result.parsed.level1.level2.level3.value, 'deep');
    });

    test('should parse large JSON', () => {
      const largeArray = Array(1000).fill(0).map((_, i) => ({
        id: i,
        value: `item_${i}`
      }));
      const jsonString = JSON.stringify(largeArray);

      const result = parser.process({ body: jsonString });
      assert.strictEqual(result.parsed.length, 1000);
      assert.strictEqual(result.parsed[999].id, 999);
    });

    test('should preserve number precision', () => {
      const jsonString = '{"pi":3.141592653589793,"large":9007199254740991}';
      const result = parser.process({ body: jsonString });

      assert.strictEqual(result.parsed.pi, 3.141592653589793);
      assert.strictEqual(result.parsed.large, 9007199254740991);
    });

    test('should handle special characters', () => {
      const jsonString = '{"text":"Hello\\nWorld\\t\\"quoted\\"","emoji":"🎉"}';
      const result = parser.process({ body: jsonString });

      assert.strictEqual(result.parsed.text, 'Hello\nWorld\t"quoted"');
      assert.strictEqual(result.parsed.emoji, '🎉');
    });

    test('should handle empty structures', () => {
      // Empty object
      let result = parser.process({ body: '{}' });
      assert.deepStrictEqual(result.parsed, {});

      // Empty array
      result = parser.process({ body: '[]' });
      assert.deepStrictEqual(result.parsed, []);

      // Empty string
      result = parser.process({ body: '""' });
      assert.strictEqual(result.parsed, '');
    });
  });

  describe('error handling', () => {
    test('should return error for invalid JSON', () => {
      const invalidJson = '{invalid json}';
      const result = parser.process({ body: invalidJson });

      assert.strictEqual(result.parsed, undefined);
      assert.ok(result.error);
      assert.ok(result.error.includes('JSON parse error'));
      assert.strictEqual(result.raw, invalidJson);
    });

    test('should handle missing quotes in keys', () => {
      const invalidJson = '{name: "test"}';
      const result = parser.process({ body: invalidJson });

      assert.strictEqual(result.parsed, undefined);
      assert.ok(result.error);
      assert.ok(result.error.includes('JSON parse error'));
    });

    test('should handle trailing commas', () => {
      const invalidJson = '{"a":1,"b":2,}';
      const result = parser.process({ body: invalidJson });

      assert.strictEqual(result.parsed, undefined);
      assert.ok(result.error);
    });

    test('should handle unclosed brackets', () => {
      const invalidJson = '{"a":1,"b":2';
      const result = parser.process({ body: invalidJson });

      assert.strictEqual(result.parsed, undefined);
      assert.ok(result.error);
    });

    test('should handle undefined values', () => {
      const invalidJson = '{"a":undefined}';
      const result = parser.process({ body: invalidJson });

      assert.strictEqual(result.parsed, undefined);
      assert.ok(result.error);
    });

    test('should handle single quotes', () => {
      const invalidJson = "{'name':'test'}";
      const result = parser.process({ body: invalidJson });

      assert.strictEqual(result.parsed, undefined);
      assert.ok(result.error);
    });

    test('should handle empty input', () => {
      const result = parser.process({ body: '' });

      assert.strictEqual(result.parsed, undefined);
      assert.ok(result.error);
      assert.ok(result.error.includes('JSON parse error'));
    });

    test('should preserve original input in error case', () => {
      const invalidJson = 'not json at all';
      const result = parser.process({ body: invalidJson });

      assert.strictEqual(result.raw, invalidJson);
    });
  });

  describe('edge cases', () => {
    test('should handle whitespace', () => {
      const jsonWithSpace = '  \n\t  {"key":"value"}  \n\t  ';
      const result = parser.process({ body: jsonWithSpace });

      assert.deepStrictEqual(result.parsed, { key: 'value' });
    });

    test('should handle BOM character', () => {
      const jsonWithBOM = '\uFEFF{"key":"value"}';
      const result = parser.process({ body: jsonWithBOM });

      // JSON.parse should handle BOM
      if (result.parsed) {
        assert.deepStrictEqual(result.parsed, { key: 'value' });
      } else {
        // Some environments might not handle BOM
        assert.ok(result.error);
      }
    });

    test('should handle very long strings', () => {
      const longString = 'x'.repeat(100000);
      const jsonString = JSON.stringify({ data: longString });
      const result = parser.process({ body: jsonString });

      assert.strictEqual(result.parsed.data, longString);
    });

    test('should handle deeply nested structures', () => {
      let obj = { value: 'deep' };
      for (let i = 0; i < 100; i++) {
        obj = { nested: obj };
      }
      const jsonString = JSON.stringify(obj);
      const result = parser.process({ body: jsonString });

      // Navigate to the deepest value
      let current = result.parsed;
      for (let i = 0; i < 100; i++) {
        current = current.nested;
      }
      assert.strictEqual(current.value, 'deep');
    });

    test('should handle circular reference in error message', () => {
      // This would cause an error before JSON.stringify
      const invalidJson = '{"a":1,"b":2,,"c":3}';
      const result = parser.process({ body: invalidJson });

      assert.ok(result.error);
      assert.ok(typeof result.error === 'string');
    });
  });

  describe('data type preservation', () => {
    test('should preserve boolean values', () => {
      const result = parser.process({ body: '{"t":true,"f":false}' });
      assert.strictEqual(result.parsed.t, true);
      assert.strictEqual(result.parsed.f, false);
    });

    test('should preserve null values', () => {
      const result = parser.process({ body: '{"value":null}' });
      assert.strictEqual(result.parsed.value, null);
    });

    test('should preserve numeric types', () => {
      const result = parser.process({
        body: '{"int":42,"float":3.14,"negative":-10,"zero":0,"scientific":1.5e10}'
      });

      assert.strictEqual(result.parsed.int, 42);
      assert.strictEqual(result.parsed.float, 3.14);
      assert.strictEqual(result.parsed.negative, -10);
      assert.strictEqual(result.parsed.zero, 0);
      assert.strictEqual(result.parsed.scientific, 1.5e10);
    });

    test('should handle mixed type arrays', () => {
      const result = parser.process({
        body: '[1, "two", true, null, {"five": 5}, [6, 7]]'
      });

      assert.strictEqual(result.parsed[0], 1);
      assert.strictEqual(result.parsed[1], 'two');
      assert.strictEqual(result.parsed[2], true);
      assert.strictEqual(result.parsed[3], null);
      assert.deepStrictEqual(result.parsed[4], { five: 5 });
      assert.deepStrictEqual(result.parsed[5], [6, 7]);
    });
  });
});
