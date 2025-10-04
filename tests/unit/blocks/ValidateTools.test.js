import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ValidateTools } from '../../../blocks/validate/ValidateTools.js';

describe('ValidateTools', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidateTools({});
  });

  describe('input/output definitions', () => {
    test('should have correct inputs', () => {
      const { inputs } = ValidateTools;
      assert.deepStrictEqual(inputs.required, ['toolCalls']);
      assert.deepStrictEqual(inputs.optional, []);
    });

    test('should have correct outputs', () => {
      const { outputs } = ValidateTools;
      assert.deepStrictEqual(outputs.produces, ['passed', 'failures', 'score', 'actualTools', 'expectedTools']);
    });
  });

  describe('tool validation without config', () => {
    test('should pass when no expectations set', () => {
      const toolCalls = [
        { name: 'getEvents', args: { date: '2024-01-15' } }
      ];

      const result = validator.process({ toolCalls });

      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.score, 1.0);
      assert.deepStrictEqual(result.actualTools, ['getEvents']);
      assert.deepStrictEqual(result.failures, []);
    });

    test('should extract tool names from tool calls', () => {
      const toolCalls = [
        { name: 'tool1', args: {} },
        { name: 'tool2', args: {} },
        { name: 'tool3', args: {} }
      ];

      const result = validator.process({ toolCalls });

      assert.strictEqual(result.passed, true);
      assert.deepStrictEqual(result.actualTools, ['tool1', 'tool2', 'tool3']);
    });

    test('should handle empty tool calls', () => {
      const result = validator.process({ toolCalls: [] });

      assert.strictEqual(result.passed, true);
      assert.deepStrictEqual(result.actualTools, []);
      assert.deepStrictEqual(result.failures, []);
    });
  });

  describe('expected tools validation', () => {
    test('should validate expected tools are present', () => {
      validator = new ValidateTools({
        expected: ['getEvents', 'createEvent']
      });

      const toolCalls = [
        { name: 'getEvents', args: {} },
        { name: 'createEvent', args: {} }
      ];

      const result = validator.process({ toolCalls });

      assert.strictEqual(result.passed, true);
      assert.deepStrictEqual(result.expectedTools, ['getEvents', 'createEvent']);
      assert.deepStrictEqual(result.actualTools, ['getEvents', 'createEvent']);
    });

    test('should fail when expected tools are missing', () => {
      validator = new ValidateTools({
        expected: ['getEvents', 'createEvent']
      });

      const toolCalls = [
        { name: 'getEvents', args: {} }
      ];

      const result = validator.process({ toolCalls });

      assert.strictEqual(result.passed, false);
      assert.ok(result.failures[0].includes('Missing expected tools: createEvent'));
      assert.ok(result.score < 1.0);
    });
  });

  describe('forbidden tools validation', () => {
    test('should pass when no forbidden tools used', () => {
      validator = new ValidateTools({
        forbidden: ['deleteAll', 'dropDatabase']
      });

      const toolCalls = [
        { name: 'getEvents', args: {} }
      ];

      const result = validator.process({ toolCalls });

      assert.strictEqual(result.passed, true);
    });

    test('should fail when forbidden tools are used', () => {
      validator = new ValidateTools({
        forbidden: ['deleteAll']
      });

      const toolCalls = [
        { name: 'getEvents', args: {} },
        { name: 'deleteAll', args: {} }
      ];

      const result = validator.process({ toolCalls });

      assert.strictEqual(result.passed, false);
      assert.ok(result.failures[0].includes('Used forbidden tools: deleteAll'));
      assert.ok(result.score < 1.0);
    });
  });

  describe('tool count validation', () => {
    test('should validate minimum tool count', () => {
      validator = new ValidateTools({
        minTools: 2
      });

      const toolCalls = [
        { name: 'tool1', args: {} }
      ];

      const result = validator.process({ toolCalls });

      assert.strictEqual(result.passed, false);
      assert.ok(result.failures[0].includes('Too few tools: 1 < 2'));
    });

    test('should validate maximum tool count', () => {
      validator = new ValidateTools({
        maxTools: 2
      });

      const toolCalls = [
        { name: 'tool1', args: {} },
        { name: 'tool2', args: {} },
        { name: 'tool3', args: {} }
      ];

      const result = validator.process({ toolCalls });

      assert.strictEqual(result.passed, false);
      assert.ok(result.failures[0].includes('Too many tools: 3 > 2'));
    });

    test('should pass when within tool count limits', () => {
      validator = new ValidateTools({
        minTools: 1,
        maxTools: 3
      });

      const toolCalls = [
        { name: 'tool1', args: {} },
        { name: 'tool2', args: {} }
      ];

      const result = validator.process({ toolCalls });

      assert.strictEqual(result.passed, true);
    });
  });

  describe('argument validation', () => {
    test('should validate expected arguments', () => {
      validator = new ValidateTools({
        validateArgs: {
          getEvents: {
            date: '2024-01-15'
          }
        }
      });

      const toolCalls = [
        { name: 'getEvents', args: { date: '2024-01-15' } }
      ];

      const result = validator.process({ toolCalls });

      assert.strictEqual(result.passed, true);
    });

    test('should fail when arguments mismatch', () => {
      validator = new ValidateTools({
        validateArgs: {
          getEvents: {
            date: '2024-01-15'
          }
        }
      });

      const toolCalls = [
        { name: 'getEvents', args: { date: '2024-01-16' } }
      ];

      const result = validator.process({ toolCalls });

      assert.strictEqual(result.passed, false);
      assert.ok(result.failures[0].includes('arg \'date\' mismatch'));
    });
  });

  describe('edge cases', () => {
    test('should handle toolName instead of name', () => {
      const toolCalls = [
        { toolName: 'myTool', args: {} }
      ];

      const result = validator.process({ toolCalls });

      assert.deepStrictEqual(result.actualTools, ['myTool']);
    });

    test('should handle missing toolCalls', () => {
      const result = validator.process({});

      assert.strictEqual(result.passed, true);
      assert.deepStrictEqual(result.actualTools, []);
    });

    test('should calculate score correctly', () => {
      validator = new ValidateTools({
        expected: ['tool1', 'tool2', 'tool3']
      });

      const toolCalls = [
        { name: 'tool1', args: {} },
        { name: 'tool2', args: {} }
      ];

      const result = validator.process({ toolCalls });

      assert.strictEqual(result.passed, false);
      // Score should be 2/3 for having 2 out of 3 expected tools
      assert.ok(result.score > 0.6 && result.score < 0.7);
    });
  });
});
