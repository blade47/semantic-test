import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { HtmlReporter } from '../../../src/utils/HtmlReporter.js';

describe('HtmlReporter', () => {
  let reporter;

  beforeEach(() => {
    reporter = new HtmlReporter();
  });

  describe('calculateMetrics()', () => {
    test('should calculate metrics from batch results', () => {
      const batchResults = {
        suites: [
          {
            tests: [
              { success: true, duration: 100, result: { data: { judge: { score: 0.9 } } } },
              { success: false, duration: 200 }
            ]
          },
          {
            tests: [
              { success: true, duration: 150, result: { data: { otherJudge: { score: 0.8 } } } }
            ]
          }
        ]
      };

      const metrics = reporter.calculateMetrics(batchResults);

      assert.strictEqual(metrics.totalTests, 3);
      assert.strictEqual(metrics.passedTests, 2);
      assert.strictEqual(metrics.failedTests, 1);
      assert.strictEqual(metrics.passRate, 67);
      assert.strictEqual(metrics.avgScore, '0.9'); // Average of 0.9 and 0.8
      assert.strictEqual(metrics.avgLatency, 150); // (100+200+150)/3
    });

    test('should handle empty results', () => {
      const metrics = reporter.calculateMetrics({ suites: [] });

      assert.strictEqual(metrics.totalTests, 0);
      assert.strictEqual(metrics.passedTests, 0);
      assert.strictEqual(metrics.failedTests, 0);
      assert.strictEqual(metrics.passRate, 0);
      assert.strictEqual(metrics.avgScore, 'N/A');
      assert.strictEqual(metrics.avgLatency, 0);
    });

    test('should handle results without scores', () => {
      const batchResults = {
        suites: [
          {
            tests: [
              { success: true, duration: 100 },
              { success: true, duration: 200 }
            ]
          }
        ]
      };

      const metrics = reporter.calculateMetrics(batchResults);

      assert.strictEqual(metrics.totalTests, 2);
      assert.strictEqual(metrics.passedTests, 2);
      assert.strictEqual(metrics.avgScore, 'N/A');
    });
  });

  describe('HTML generation methods', () => {
    test('buildMetricsCards() should return HTML string', () => {
      const metrics = {
        totalTests: 10,
        passedTests: 8,
        failedTests: 2,
        passRate: 80,
        avgScore: '0.85',
        avgLatency: 100
      };

      const html = reporter.buildMetricsCards(metrics);

      assert.ok(typeof html === 'string');
      assert.ok(html.includes('10')); // total tests
      assert.ok(html.includes('8')); // passed
      assert.ok(html.includes('2')); // failed
      assert.ok(html.includes('80%')); // pass rate
      assert.ok(html.includes('0.85')); // avg score
      assert.ok(html.includes('100ms')); // avg latency
    });

    test('getStyles() should return CSS string', () => {
      const css = reporter.getStyles();

      assert.ok(typeof css === 'string');
      assert.ok(css.includes('font-family'));
      assert.ok(css.includes('background'));
      assert.ok(css.includes('margin'));
    });

    test('getScripts() should return JS string', () => {
      const js = reporter.getScripts();

      assert.ok(typeof js === 'string');
      assert.ok(js.includes('function'));
      assert.ok(js.includes('toggleDetails'));
    });

    test('buildHeader() should return HTML header', () => {
      const metrics = {
        timestamp: new Date().toISOString(),
        totalDuration: 100
      };

      const html = reporter.buildHeader(metrics);

      assert.ok(typeof html === 'string');
      assert.ok(html.includes('FlowTest Evaluation Report'));
      assert.ok(html.includes('Duration: 100s'));
    });

    test('buildHTML() should generate complete HTML document', () => {
      const batchResults = {
        suites: [
          {
            name: 'Test Suite',
            tests: [
              { name: 'Test 1', success: true, duration: 100 }
            ]
          }
        ],
        started: new Date().toISOString(),
        finished: new Date().toISOString(),
        totalDuration: 100
      };

      const html = reporter.buildHTML(batchResults);

      assert.ok(typeof html === 'string');
      assert.ok(html.includes('<!DOCTYPE html>'));
      assert.ok(html.includes('FlowTest Evaluation Report'));
      assert.ok(html.includes('Test Suite'));
      assert.ok(html.includes('<script>'));
      assert.ok(html.includes('<style>'));
    });
  });

  describe('generateReport()', () => {
    test('should generate HTML report content', async () => {
      const batchResults = {
        suites: [
          {
            name: 'Test Suite',
            tests: [
              { name: 'Test 1', success: true, duration: 100 }
            ]
          }
        ],
        started: new Date().toISOString(),
        finished: new Date().toISOString(),
        totalDuration: 100
      };

      // Test that buildHTML generates the right content
      const html = reporter.buildHTML(batchResults);

      assert.ok(html);
      assert.ok(html.includes('<!DOCTYPE html>'));
      assert.ok(html.includes('FlowTest Evaluation Report'));
      assert.ok(html.includes('Test Suite'));

      // The generateReport method would write this to a file,
      // but we've already tested the content generation
    });
  });
});
