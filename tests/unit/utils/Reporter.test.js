import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Reporter } from '../../../src/utils/Reporter.js';

describe('Reporter', () => {
  let reporter;

  beforeEach(() => {
    reporter = new Reporter();
  });

  describe('getStats()', () => {
    test('should calculate correct statistics', () => {
      const results = [
        { success: true, duration: 100 },
        { success: false, duration: 200 },
        { success: true, duration: 150 }
      ];

      const stats = reporter.getStats(results);

      assert.strictEqual(stats.passed, 2);
      assert.strictEqual(stats.failed, 1);
      assert.strictEqual(stats.total, 3);
      assert.strictEqual(stats.passRate, '66.7');
      assert.strictEqual(stats.totalDuration, 450);
    });

    test('should handle empty results', () => {
      const stats = reporter.getStats([]);

      assert.strictEqual(stats.passed, 0);
      assert.strictEqual(stats.failed, 0);
      assert.strictEqual(stats.total, 0);
      assert.strictEqual(stats.passRate, 0);
      assert.strictEqual(stats.totalDuration, 0);
    });

    test('should handle all passed results', () => {
      const results = [
        { success: true, duration: 100 },
        { success: true, duration: 200 }
      ];

      const stats = reporter.getStats(results);

      assert.strictEqual(stats.passed, 2);
      assert.strictEqual(stats.failed, 0);
      assert.strictEqual(stats.passRate, '100.0');
    });

    test('should handle all failed results', () => {
      const results = [
        { success: false, duration: 100 },
        { success: false, duration: 200 }
      ];

      const stats = reporter.getStats(results);

      assert.strictEqual(stats.passed, 0);
      assert.strictEqual(stats.failed, 2);
      assert.strictEqual(stats.passRate, '0.0');
    });

    test('should handle missing duration values', () => {
      const results = [
        { success: true },
        { success: false, duration: 100 },
        { success: true, duration: null }
      ];

      const stats = reporter.getStats(results);

      assert.strictEqual(stats.totalDuration, 100);
    });
  });

  describe('reporter options', () => {
    test('should initialize with default options', () => {
      const r = new Reporter();
      assert.strictEqual(r.verbose, false);
      assert.strictEqual(r.outputFile, undefined);
    });

    test('should accept verbose option', () => {
      const r = new Reporter({ verbose: true });
      assert.strictEqual(r.verbose, true);
    });

    test('should accept outputFile option', () => {
      const r = new Reporter({ outputFile: 'test.json' });
      assert.strictEqual(r.outputFile, 'test.json');
    });

    test('should accept multiple options', () => {
      const r = new Reporter({
        verbose: true,
        outputFile: 'report.json'
      });
      assert.strictEqual(r.verbose, true);
      assert.strictEqual(r.outputFile, 'report.json');
    });
  });

  describe('reportSuite()', () => {
    test('should handle suite with tests', () => {
      const suiteResult = {
        name: 'Test Suite',
        success: true,
        totalDuration: 500,
        tests: [
          { name: 'Test 1', success: true, duration: 100 },
          { name: 'Test 2', success: false, duration: 200 }
        ]
      };

      // Should not throw
      assert.doesNotThrow(() => reporter.reportSuite(suiteResult));
    });

    test('should handle suite with error', () => {
      const suiteResult = {
        name: 'Test Suite',
        success: false,
        error: 'Setup failed',
        tests: []
      };

      // Should not throw
      assert.doesNotThrow(() => reporter.reportSuite(suiteResult));
    });

    test('should handle suite without tests', () => {
      const suiteResult = {
        name: 'Empty Suite',
        success: true,
        totalDuration: 0
      };

      // Should not throw
      assert.doesNotThrow(() => reporter.reportSuite(suiteResult));
    });
  });

  describe('reportBatchSummary()', () => {
    test('should calculate batch statistics', () => {
      const batchResults = {
        suites: [
          {
            success: true,
            tests: [
              { success: true },
              { success: true }
            ]
          },
          {
            success: false,
            tests: [
              { success: true },
              { success: false }
            ]
          }
        ],
        totalDuration: 1000
      };

      // Should not throw
      assert.doesNotThrow(() => reporter.reportBatchSummary(batchResults));
    });

    test('should handle empty batch', () => {
      const batchResults = {
        suites: [],
        totalDuration: 0
      };

      // Should not throw
      assert.doesNotThrow(() => reporter.reportBatchSummary(batchResults));
    });

    test('should handle failed suites with setup errors', () => {
      const batchResults = {
        suites: [
          {
            name: 'Failed Suite',
            success: false,
            setupError: 'Could not connect',
            tests: []
          }
        ],
        totalDuration: 100
      };

      // Should not throw
      assert.doesNotThrow(() => reporter.reportBatchSummary(batchResults));
    });
  });
});
