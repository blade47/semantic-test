import { test, describe } from 'node:test';
import assert from 'node:assert';
import { SuiteRunner } from '../../../src/suite-runner.js';

describe('SuiteRunner', () => {
  let runner;

  describe('checkAssertions', () => {
    test('should pass with simple equality assertions', () => {
      runner = new SuiteRunner();

      const result = { success: true, data: { status: 200, message: 'ok' } };
      const assertions = {
        status: 200,
        message: 'ok'
      };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, true);
      assert.strictEqual(checked.checks.length, 2);
      assert.strictEqual(checked.checks[0].passed, true);
      assert.strictEqual(checked.checks[1].passed, true);
    });

    test('should fail when simple equality does not match', () => {
      runner = new SuiteRunner();

      const result = { success: true, data: { status: 404 } };
      const assertions = { status: 200 };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, false);
      assert.strictEqual(checked.checks[0].passed, false);
      assert.strictEqual(checked.checks[0].actual, 404);
      assert.strictEqual(checked.checks[0].expected, 200);
    });

    test('should work with equals operator', () => {
      runner = new SuiteRunner();

      const result = { success: true, data: { status: 200 } };
      const assertions = {
        status: { equals: 200 }
      };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, true);
      assert.strictEqual(checked.checks[0].passed, true);
    });

    test('should work with notEquals operator', () => {
      runner = new SuiteRunner();

      const result = { success: true, data: { status: 200 } };
      const assertions = {
        status: { notEquals: 404 }
      };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, true);
    });

    test('should work with gt/gte/lt/lte operators', () => {
      runner = new SuiteRunner();

      const result = { success: true, data: { age: 25 } };
      const assertions = {
        age: { gt: 18, gte: 25, lt: 30, lte: 25 }
      };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, true);
      assert.strictEqual(checked.checks[0].passed, true);
    });

    test('should work with contains operator', () => {
      runner = new SuiteRunner();

      const result = {
        success: true,
        data: {
          message: 'hello world',
          roles: ['admin', 'user']
        }
      };

      const assertions = {
        message: { contains: 'world' },
        roles: { contains: 'admin' }
      };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, true);
    });

    test('should work with notContains operator', () => {
      runner = new SuiteRunner();

      const result = { success: true, data: { message: 'hello world' } };
      const assertions = {
        message: { notContains: 'error' }
      };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, true);
    });

    test('should work with minLength/maxLength operators', () => {
      runner = new SuiteRunner();

      const result = {
        success: true,
        data: {
          name: 'John',
          items: [1, 2, 3]
        }
      };

      const assertions = {
        name: { minLength: 1, maxLength: 10 },
        items: { minLength: 1, maxLength: 5 }
      };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, true);
    });

    test('should work with matches/notMatches operators', () => {
      runner = new SuiteRunner();

      const result = {
        success: true,
        data: {
          email: 'test@example.com',
          username: 'john123'
        }
      };

      const assertions = {
        email: { matches: '.*@.*\\..*' },
        username: { notMatches: '^admin.*' }
      };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, true);
    });

    test('should work with isNull/isNotNull operators', () => {
      runner = new SuiteRunner();

      const result = {
        success: true,
        data: {
          error: null,
          value: 42
        }
      };

      const assertions = {
        error: { isNull: true },
        value: { isNotNull: true }
      };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, true);
    });

    test('should work with isDefined/isUndefined operators', () => {
      runner = new SuiteRunner();

      const result = {
        success: true,
        data: {
          name: 'John'
        }
      };

      const assertions = {
        name: { isDefined: true },
        missing: { isUndefined: true }
      };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, true);
    });

    test('should work with isTrue/isFalse operators', () => {
      runner = new SuiteRunner();

      const result = {
        success: true,
        data: {
          passed: true,
          failed: false
        }
      };

      const assertions = {
        passed: { isTrue: true },
        failed: { isFalse: true }
      };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, true);
    });

    test('should work with isEmpty/isNotEmpty operators', () => {
      runner = new SuiteRunner();

      const result = {
        success: true,
        data: {
          emptyStr: '',
          emptyArr: [],
          emptyObj: {},
          filled: 'data',
          items: [1, 2]
        }
      };

      const assertions = {
        emptyStr: { isEmpty: true },
        emptyArr: { isEmpty: true },
        emptyObj: { isEmpty: true },
        filled: { isNotEmpty: true },
        items: { isNotEmpty: true }
      };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, true);
    });

    test('should combine multiple operators with AND logic', () => {
      runner = new SuiteRunner();

      const result = {
        success: true,
        data: {
          age: 25,
          email: 'user@example.com'
        }
      };

      const assertions = {
        age: { gt: 18, lt: 100 },
        email: { matches: '.*@.*', contains: '@', isNotEmpty: true }
      };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, true);
    });

    test('should fail when one operator in group fails', () => {
      runner = new SuiteRunner();

      const result = { success: true, data: { age: 10 } };
      const assertions = {
        age: { gt: 18, lt: 100 }
      };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, false);
    });

    test('should handle nested paths', () => {
      runner = new SuiteRunner();

      const result = {
        success: true,
        data: {
          user: {
            profile: {
              email: 'test@example.com'
            }
          }
        }
      };

      const assertions = {
        'user.profile.email': { contains: '@' }
      };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, true);
    });

    test('should return empty result when no assertions', () => {
      runner = new SuiteRunner();

      const result = { success: true, data: {} };
      const checked = runner.checkAssertions(result, null);

      assert.strictEqual(checked.passed, true);
      assert.strictEqual(checked.checks.length, 0);
    });

    test('should include error message when assertion fails', () => {
      runner = new SuiteRunner();

      const result = { success: true, data: { status: 404 } };
      const assertions = {
        status: { equals: 200 }
      };

      const checked = runner.checkAssertions(result, assertions);

      assert.strictEqual(checked.passed, false);
      assert.ok(checked.checks[0].message);
      assert.ok(checked.checks[0].message.includes('status'));
    });
  });
});
