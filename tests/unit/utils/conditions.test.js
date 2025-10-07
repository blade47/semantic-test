import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  evaluateOperator,
  evaluateCondition,
  evaluateConditions,
  formatCondition,
  getAvailableOperators
} from '../../../src/utils/conditions.js';

describe('conditions', () => {
  describe('evaluateOperator - equality', () => {
    test('equals - should match equal values', () => {
      assert.strictEqual(evaluateOperator(200, 'equals', 200), true);
      assert.strictEqual(evaluateOperator('hello', 'equals', 'hello'), true);
      assert.strictEqual(evaluateOperator(true, 'equals', true), true);
      assert.strictEqual(evaluateOperator(null, 'equals', null), true);
    });

    test('equals - should not match different values', () => {
      assert.strictEqual(evaluateOperator(200, 'equals', 404), false);
      assert.strictEqual(evaluateOperator('hello', 'equals', 'world'), false);
    });

    test('notEquals - should match different values', () => {
      assert.strictEqual(evaluateOperator(200, 'notEquals', 404), true);
      assert.strictEqual(evaluateOperator('hello', 'notEquals', 'world'), true);
    });

    test('notEquals - should not match equal values', () => {
      assert.strictEqual(evaluateOperator(200, 'notEquals', 200), false);
    });
  });

  describe('evaluateOperator - numeric comparisons', () => {
    test('gt - greater than', () => {
      assert.strictEqual(evaluateOperator(10, 'gt', 5), true);
      assert.strictEqual(evaluateOperator(5, 'gt', 10), false);
      assert.strictEqual(evaluateOperator(5, 'gt', 5), false);
    });

    test('gte - greater than or equal', () => {
      assert.strictEqual(evaluateOperator(10, 'gte', 5), true);
      assert.strictEqual(evaluateOperator(5, 'gte', 5), true);
      assert.strictEqual(evaluateOperator(3, 'gte', 5), false);
    });

    test('lt - less than', () => {
      assert.strictEqual(evaluateOperator(5, 'lt', 10), true);
      assert.strictEqual(evaluateOperator(10, 'lt', 5), false);
      assert.strictEqual(evaluateOperator(5, 'lt', 5), false);
    });

    test('lte - less than or equal', () => {
      assert.strictEqual(evaluateOperator(5, 'lte', 10), true);
      assert.strictEqual(evaluateOperator(5, 'lte', 5), true);
      assert.strictEqual(evaluateOperator(10, 'lte', 5), false);
    });
  });

  describe('evaluateOperator - contains', () => {
    test('contains - string contains substring', () => {
      assert.strictEqual(evaluateOperator('hello world', 'contains', 'world'), true);
      assert.strictEqual(evaluateOperator('hello world', 'contains', 'xyz'), false);
    });

    test('contains - array contains element', () => {
      assert.strictEqual(evaluateOperator(['a', 'b', 'c'], 'contains', 'b'), true);
      assert.strictEqual(evaluateOperator(['a', 'b', 'c'], 'contains', 'd'), false);
    });

    test('contains - returns false for non-string/array', () => {
      assert.strictEqual(evaluateOperator(123, 'contains', 'test'), false);
      assert.strictEqual(evaluateOperator(null, 'contains', 'test'), false);
    });

    test('notContains - string does not contain substring', () => {
      assert.strictEqual(evaluateOperator('hello world', 'notContains', 'xyz'), true);
      assert.strictEqual(evaluateOperator('hello world', 'notContains', 'world'), false);
    });

    test('notContains - array does not contain element', () => {
      assert.strictEqual(evaluateOperator(['a', 'b', 'c'], 'notContains', 'd'), true);
      assert.strictEqual(evaluateOperator(['a', 'b', 'c'], 'notContains', 'b'), false);
    });
  });

  describe('evaluateOperator - length checks', () => {
    test('minLength - string meets minimum length', () => {
      assert.strictEqual(evaluateOperator('hello', 'minLength', 3), true);
      assert.strictEqual(evaluateOperator('hello', 'minLength', 5), true);
      assert.strictEqual(evaluateOperator('hello', 'minLength', 10), false);
    });

    test('minLength - array meets minimum length', () => {
      assert.strictEqual(evaluateOperator([1, 2, 3], 'minLength', 2), true);
      assert.strictEqual(evaluateOperator([1, 2, 3], 'minLength', 5), false);
    });

    test('maxLength - string under maximum length', () => {
      assert.strictEqual(evaluateOperator('hello', 'maxLength', 10), true);
      assert.strictEqual(evaluateOperator('hello', 'maxLength', 5), true);
      assert.strictEqual(evaluateOperator('hello', 'maxLength', 3), false);
    });

    test('maxLength - array under maximum length', () => {
      assert.strictEqual(evaluateOperator([1, 2, 3], 'maxLength', 5), true);
      assert.strictEqual(evaluateOperator([1, 2, 3], 'maxLength', 2), false);
    });
  });

  describe('evaluateOperator - pattern matching', () => {
    test('matches - string matches regex', () => {
      assert.strictEqual(evaluateOperator('hello123', 'matches', '^hello\\d+$'), true);
      assert.strictEqual(evaluateOperator('hello', 'matches', '^hello\\d+$'), false);
      assert.strictEqual(evaluateOperator('test@example.com', 'matches', '.*@.*\\..*'), true);
    });

    test('matches - returns false for non-string', () => {
      assert.strictEqual(evaluateOperator(123, 'matches', '\\d+'), false);
    });

    test('notMatches - string does not match regex', () => {
      assert.strictEqual(evaluateOperator('hello', 'notMatches', '^\\d+$'), true);
      assert.strictEqual(evaluateOperator('123', 'notMatches', '^\\d+$'), false);
    });
  });

  describe('evaluateOperator - type checks', () => {
    test('isNull - checks for null', () => {
      assert.strictEqual(evaluateOperator(null, 'isNull'), true);
      assert.strictEqual(evaluateOperator(undefined, 'isNull'), false);
      assert.strictEqual(evaluateOperator('', 'isNull'), false);
      assert.strictEqual(evaluateOperator(0, 'isNull'), false);
    });

    test('isNotNull - checks for not null', () => {
      assert.strictEqual(evaluateOperator('hello', 'isNotNull'), true);
      assert.strictEqual(evaluateOperator(0, 'isNotNull'), true);
      assert.strictEqual(evaluateOperator(null, 'isNotNull'), false);
    });

    test('isDefined - checks for defined', () => {
      assert.strictEqual(evaluateOperator('hello', 'isDefined'), true);
      assert.strictEqual(evaluateOperator(null, 'isDefined'), true);
      assert.strictEqual(evaluateOperator(undefined, 'isDefined'), false);
    });

    test('isUndefined - checks for undefined', () => {
      assert.strictEqual(evaluateOperator(undefined, 'isUndefined'), true);
      assert.strictEqual(evaluateOperator(null, 'isUndefined'), false);
      assert.strictEqual(evaluateOperator('', 'isUndefined'), false);
    });

    test('isTrue - checks for boolean true', () => {
      assert.strictEqual(evaluateOperator(true, 'isTrue'), true);
      assert.strictEqual(evaluateOperator(false, 'isTrue'), false);
      assert.strictEqual(evaluateOperator(1, 'isTrue'), false);
      assert.strictEqual(evaluateOperator('true', 'isTrue'), false);
    });

    test('isFalse - checks for boolean false', () => {
      assert.strictEqual(evaluateOperator(false, 'isFalse'), true);
      assert.strictEqual(evaluateOperator(true, 'isFalse'), false);
      assert.strictEqual(evaluateOperator(0, 'isFalse'), false);
    });
  });

  describe('evaluateOperator - empty checks', () => {
    test('isEmpty - string', () => {
      assert.strictEqual(evaluateOperator('', 'isEmpty'), true);
      assert.strictEqual(evaluateOperator('hello', 'isEmpty'), false);
    });

    test('isEmpty - array', () => {
      assert.strictEqual(evaluateOperator([], 'isEmpty'), true);
      assert.strictEqual(evaluateOperator([1], 'isEmpty'), false);
    });

    test('isEmpty - object', () => {
      assert.strictEqual(evaluateOperator({}, 'isEmpty'), true);
      assert.strictEqual(evaluateOperator({ a: 1 }, 'isEmpty'), false);
    });

    test('isNotEmpty - string', () => {
      assert.strictEqual(evaluateOperator('hello', 'isNotEmpty'), true);
      assert.strictEqual(evaluateOperator('', 'isNotEmpty'), false);
    });

    test('isNotEmpty - array', () => {
      assert.strictEqual(evaluateOperator([1], 'isNotEmpty'), true);
      assert.strictEqual(evaluateOperator([], 'isNotEmpty'), false);
    });

    test('isNotEmpty - object', () => {
      assert.strictEqual(evaluateOperator({ a: 1 }, 'isNotEmpty'), true);
      assert.strictEqual(evaluateOperator({}, 'isNotEmpty'), false);
    });
  });

  describe('evaluateOperator - errors', () => {
    test('should throw for unknown operator', () => {
      assert.throws(
        () => evaluateOperator('test', 'unknownOp', 'value'),
        /Unknown operator: unknownOp/
      );
    });
  });

  describe('evaluateCondition', () => {
    test('should evaluate condition with path', () => {
      const data = {
        response: { status: 200 }
      };

      const condition = {
        path: 'response.status',
        operator: 'equals',
        value: 200
      };

      assert.strictEqual(evaluateCondition(data, condition), true);
    });

    test('should evaluate nested path', () => {
      const data = {
        user: {
          profile: {
            email: 'test@example.com'
          }
        }
      };

      const condition = {
        path: 'user.profile.email',
        operator: 'matches',
        value: '.*@.*\\..*'
      };

      assert.strictEqual(evaluateCondition(data, condition), true);
    });

    test('should handle array path', () => {
      const data = {
        users: [
          { name: 'Alice' },
          { name: 'Bob' }
        ]
      };

      const condition = {
        path: 'users[0].name',
        operator: 'equals',
        value: 'Alice'
      };

      assert.strictEqual(evaluateCondition(data, condition), true);
    });

    test('should work with operators that do not need value', () => {
      const data = { flag: true };

      const condition = {
        path: 'flag',
        operator: 'isTrue'
      };

      assert.strictEqual(evaluateCondition(data, condition), true);
    });

    test('should throw if condition is missing', () => {
      assert.throws(
        () => evaluateCondition({ data: 'test' }, null),
        /Condition is required/
      );
    });

    test('should throw if path is missing', () => {
      assert.throws(
        () => evaluateCondition({ data: 'test' }, { operator: 'equals', value: 'test' }),
        /Condition path is required/
      );
    });

    test('should throw if operator is missing', () => {
      assert.throws(
        () => evaluateCondition({ data: 'test' }, { path: 'data', value: 'test' }),
        /Condition operator is required/
      );
    });

    test('should throw if value is missing for value-requiring operator', () => {
      assert.throws(
        () => evaluateCondition({ data: 'test' }, { path: 'data', operator: 'equals' }),
        /Operator 'equals' requires a value/
      );
    });
  });

  describe('evaluateConditions', () => {
    test('should evaluate multiple conditions with AND logic', () => {
      const data = {
        status: 200,
        message: 'Success',
        count: 5
      };

      const conditions = [
        { path: 'status', operator: 'equals', value: 200 },
        { path: 'message', operator: 'contains', value: 'Success' },
        { path: 'count', operator: 'gt', value: 0 }
      ];

      assert.strictEqual(evaluateConditions(data, conditions), true);
    });

    test('should fail if any condition fails', () => {
      const data = {
        status: 200,
        message: 'Success'
      };

      const conditions = [
        { path: 'status', operator: 'equals', value: 200 },
        { path: 'message', operator: 'contains', value: 'Error' } // This fails
      ];

      assert.strictEqual(evaluateConditions(data, conditions), false);
    });

    test('should return true for empty conditions array', () => {
      assert.strictEqual(evaluateConditions({ data: 'test' }, []), true);
    });

    test('should throw if conditions is not an array', () => {
      assert.throws(
        () => evaluateConditions({ data: 'test' }, { path: 'data', operator: 'equals' }),
        /Conditions must be an array/
      );
    });
  });

  describe('formatCondition', () => {
    test('should format equals condition', () => {
      const formatted = formatCondition({
        path: 'status',
        operator: 'equals',
        value: 200
      });
      assert.strictEqual(formatted, 'status === 200');
    });

    test('should format string value', () => {
      const formatted = formatCondition({
        path: 'message',
        operator: 'equals',
        value: 'hello'
      });
      assert.strictEqual(formatted, 'message === "hello"');
    });

    test('should format comparison operators', () => {
      assert.strictEqual(
        formatCondition({ path: 'count', operator: 'gt', value: 5 }),
        'count > 5'
      );
      assert.strictEqual(
        formatCondition({ path: 'age', operator: 'gte', value: 18 }),
        'age >= 18'
      );
    });

    test('should format no-value operators', () => {
      assert.strictEqual(
        formatCondition({ path: 'value', operator: 'isNull' }),
        'value is null'
      );
      assert.strictEqual(
        formatCondition({ path: 'flag', operator: 'isTrue' }),
        'flag is true'
      );
    });
  });

  describe('getAvailableOperators', () => {
    test('should return list of all operators', () => {
      const operators = getAvailableOperators();
      assert.ok(Array.isArray(operators));
      assert.ok(operators.length > 0);

      // Check structure
      operators.forEach(op => {
        assert.ok(typeof op.name === 'string');
        assert.ok(typeof op.description === 'string');
        assert.ok(typeof op.requiresValue === 'boolean');
      });
    });

    test('should include all expected operators', () => {
      const operators = getAvailableOperators();
      const names = operators.map(op => op.name);

      const expected = [
        'equals', 'notEquals', 'gt', 'gte', 'lt', 'lte',
        'contains', 'notContains', 'minLength', 'maxLength',
        'matches', 'notMatches', 'isNull', 'isNotNull',
        'isDefined', 'isUndefined', 'isTrue', 'isFalse',
        'isEmpty', 'isNotEmpty'
      ];

      expected.forEach(name => {
        assert.ok(names.includes(name), `Missing operator: ${name}`);
      });
    });
  });
});
