import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ValidateContent } from '../../../blocks/validate/ValidateContent.js';

describe('ValidateContent', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidateContent({});
  });

  describe('input/output definitions', () => {
    test('should have correct inputs', () => {
      const { inputs } = ValidateContent;
      assert.deepStrictEqual(inputs.required, []);
      assert.deepStrictEqual(inputs.optional, ['text']);
    });

    test('should have correct outputs', () => {
      const { outputs } = ValidateContent;
      assert.deepStrictEqual(outputs.produces, ['passed', 'failures', 'score']);
    });
  });

  describe('contains validation', () => {
    test('should pass when text contains expected string', () => {
      validator = new ValidateContent({ contains: 'hello' });
      const result = validator.process({ text: 'hello world' });

      assert.strictEqual(result.passed, true);
      assert.deepStrictEqual(result.failures, []);
      assert.strictEqual(result.score, 1.0);
      assert.strictEqual(result.checks.contains_hello, true);
    });

    test('should fail when text does not contain expected string', () => {
      validator = new ValidateContent({ contains: 'goodbye' });
      const result = validator.process({ text: 'hello world' });

      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.failures.length, 1);
      assert.ok(result.failures[0].includes('Missing expected content: goodbye'));
      assert.ok(result.score < 1.0);
    });

    test('should handle multiple contains requirements', () => {
      validator = new ValidateContent({ contains: ['hello', 'world', 'test'] });
      const result = validator.process({ text: 'hello world' });

      assert.strictEqual(result.passed, false);
      assert.ok(result.failures[0].includes('test'));
      assert.strictEqual(result.score, 2 / 3); // 2 out of 3 found
    });

    test('should be case insensitive', () => {
      validator = new ValidateContent({ contains: 'HELLO' });
      const result = validator.process({ text: 'hello world' });

      assert.strictEqual(result.passed, true);
    });

    test('should handle all contains requirements met', () => {
      validator = new ValidateContent({ contains: ['hello', 'world'] });
      const result = validator.process({ text: 'hello beautiful world' });

      assert.strictEqual(result.passed, true);
      assert.deepStrictEqual(result.failures, []);
      assert.strictEqual(result.score, 1.0);
    });
  });

  describe('notContains validation', () => {
    test('should pass when text does not contain forbidden string', () => {
      validator = new ValidateContent({ notContains: 'error' });
      const result = validator.process({ text: 'success message' });

      assert.strictEqual(result.passed, true);
      assert.deepStrictEqual(result.failures, []);
      assert.strictEqual(result.score, 1.0);
    });

    test('should fail when text contains forbidden string', () => {
      validator = new ValidateContent({ notContains: 'error' });
      const result = validator.process({ text: 'error occurred' });

      assert.strictEqual(result.passed, false);
      assert.ok(result.failures[0].includes('Found forbidden content: error'));
      assert.strictEqual(result.score, 0.5);
    });

    test('should handle multiple forbidden strings', () => {
      validator = new ValidateContent({ notContains: ['error', 'fail', 'exception'] });
      const result = validator.process({ text: 'error and fail happened' });

      assert.strictEqual(result.passed, false);
      assert.ok(result.failures[0].includes('error, fail'));
      assert.strictEqual(result.score, 0.5);
    });

    test('should be case insensitive', () => {
      validator = new ValidateContent({ notContains: 'ERROR' });
      const result = validator.process({ text: 'error occurred' });

      assert.strictEqual(result.passed, false);
    });
  });

  describe('length validation', () => {
    test('should pass when text meets minLength', () => {
      validator = new ValidateContent({ minLength: 10 });
      const result = validator.process({ text: 'hello world' }); // 11 chars

      assert.strictEqual(result.passed, true);
    });

    test('should fail when text is too short', () => {
      validator = new ValidateContent({ minLength: 20 });
      const result = validator.process({ text: 'hello' }); // 5 chars

      assert.strictEqual(result.passed, false);
      assert.ok(result.failures[0].includes('Text too short: 5 < 20'));
      assert.strictEqual(result.score, 0.8);
    });

    test('should pass when text meets maxLength', () => {
      validator = new ValidateContent({ maxLength: 20 });
      const result = validator.process({ text: 'hello world' }); // 11 chars

      assert.strictEqual(result.passed, true);
    });

    test('should fail when text is too long', () => {
      validator = new ValidateContent({ maxLength: 5 });
      const result = validator.process({ text: 'hello world' }); // 11 chars

      assert.strictEqual(result.passed, false);
      assert.ok(result.failures[0].includes('Text too long: 11 > 5'));
      assert.strictEqual(result.score, 0.9);
    });

    test('should validate both min and max length', () => {
      validator = new ValidateContent({ minLength: 5, maxLength: 10 });

      // Too short
      let result = validator.process({ text: 'hi' });
      assert.strictEqual(result.passed, false);

      // Just right
      result = validator.process({ text: 'hello' });
      assert.strictEqual(result.passed, true);

      // Too long
      result = validator.process({ text: 'hello world!' });
      assert.strictEqual(result.passed, false);
    });
  });

  describe('regex pattern matching', () => {
    test('should pass when text matches pattern', () => {
      validator = new ValidateContent({ matches: '^Hello.*world$' });
      const result = validator.process({ text: 'Hello beautiful world' });

      assert.strictEqual(result.passed, true);
    });

    test('should fail when text does not match pattern', () => {
      validator = new ValidateContent({ matches: '^Hello.*world$' });
      const result = validator.process({ text: 'Goodbye world' });

      assert.strictEqual(result.passed, false);
      assert.ok(result.failures[0].includes("doesn't match pattern"));
      assert.strictEqual(result.score, 0.7);
    });

    test('should use custom regex flags', () => {
      validator = new ValidateContent({
        matches: '^hello',
        matchFlags: 'i' // case insensitive
      });
      const result = validator.process({ text: 'HELLO world' });

      assert.strictEqual(result.passed, true);
    });

    test('should default to case insensitive', () => {
      validator = new ValidateContent({ matches: 'hello' });
      const result = validator.process({ text: 'HELLO' });

      assert.strictEqual(result.passed, true);
    });

    test('should match email pattern', () => {
      validator = new ValidateContent({
        matches: '^[\\w._%+-]+@[\\w.-]+\\.[A-Za-z]{2,}$'
      });

      let result = validator.process({ text: 'user@example.com' });
      assert.strictEqual(result.passed, true);

      result = validator.process({ text: 'invalid-email' });
      assert.strictEqual(result.passed, false);
    });
  });

  describe('combined validations', () => {
    test('should apply all validations', () => {
      validator = new ValidateContent({
        contains: ['hello', 'world'],
        notContains: 'error',
        minLength: 10,
        maxLength: 20,
        matches: 'hello.*world'
      });

      const result = validator.process({ text: 'hello world' });
      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.score, 1.0);
    });

    test('should accumulate failures from multiple validations', () => {
      validator = new ValidateContent({
        contains: 'missing',
        notContains: 'error',
        minLength: 100
      });

      const result = validator.process({ text: 'error message' });
      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.failures.length, 3);
      assert.ok(result.score < 1.0);
    });

    test('should calculate combined score', () => {
      validator = new ValidateContent({
        contains: ['found', 'missing'], // 50% match
        minLength: 100 // fail with 0.8 multiplier
      });

      const result = validator.process({ text: 'found text' });
      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.score, 0.5 * 0.8); // 0.4
    });
  });

  describe('edge cases', () => {
    test('should handle empty text', () => {
      validator = new ValidateContent({ contains: 'hello' });
      const result = validator.process({ text: '' });

      assert.strictEqual(result.passed, false);
      assert.ok(result.failures[0].includes('Missing expected content'));
    });

    test('should handle text with only whitespace', () => {
      validator = new ValidateContent({ minLength: 1 });
      const result = validator.process({ text: '   ' });

      assert.strictEqual(result.passed, true); // whitespace counts as length
    });

    test('should handle special characters in contains', () => {
      validator = new ValidateContent({ contains: 'hello\nworld' });
      const result = validator.process({ text: 'say hello\nworld today' });

      assert.strictEqual(result.passed, true);
    });

    test('should handle very long text', () => {
      const longText = 'x'.repeat(10000);
      validator = new ValidateContent({ contains: 'x' });
      const result = validator.process({ text: longText });

      assert.strictEqual(result.passed, true);
    });

    test('should handle no validation config', () => {
      validator = new ValidateContent({});
      const result = validator.process({ text: 'any text' });

      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.score, 1.0);
      assert.deepStrictEqual(result.failures, []);
    });

    test('should handle unicode text', () => {
      validator = new ValidateContent({ contains: '🎉' });
      const result = validator.process({ text: 'Celebration 🎉 time!' });

      assert.strictEqual(result.passed, true);
    });

    test('should fail when text is undefined', () => {
      validator = new ValidateContent({ minLength: 5 });
      const result = validator.process({ text: undefined });

      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.score, 0);
      assert.ok(result.failures[0].includes('Missing required input: text'));
    });

    test('should fail when text is null', () => {
      validator = new ValidateContent({ contains: 'hello' });
      const result = validator.process({ text: null });

      assert.strictEqual(result.passed, false);
      assert.strictEqual(result.score, 0);
      assert.ok(result.failures[0].includes('Missing required input: text'));
    });
  });

  describe('checks tracking', () => {
    test('should track individual contains checks', () => {
      validator = new ValidateContent({ contains: ['a', 'b', 'c'] });
      const result = validator.process({ text: 'a and b' });

      assert.strictEqual(result.checks.contains_a, true);
      assert.strictEqual(result.checks.contains_b, true);
      assert.strictEqual(result.checks.contains_c, false);
    });

    test('should provide detailed check results', () => {
      validator = new ValidateContent({
        contains: 'hello',
        notContains: 'error',
        minLength: 5
      });

      const result = validator.process({ text: 'hello world' });

      assert.strictEqual(result.checks.contains_hello, true);
      // Other checks are tracked internally
      assert.strictEqual(result.passed, true);
    });
  });
});
