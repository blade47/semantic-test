#!/usr/bin/env node

import { PipelineBuilder } from './core/PipelineBuilder.js';
import { Reporter } from './utils/Reporter.js';
import { HtmlReporter } from './utils/HtmlReporter.js';
import { getPath } from './utils/path.js';
import { logger } from './utils/logger.js';
import { measureTime } from './utils/timing.js';
import { SEPARATORS } from './utils/constants.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Assertion check functions (reused from runner.js)
const ASSERTION_CHECKS = {
  equals: (actual, expected) => actual === expected,
  contains: (actual, expected) => {
    if (typeof actual === 'string' || Array.isArray(actual)) {
      return actual.includes(expected);
    }
    return false;
  },
  gt: (actual, expected) => actual > expected,
  lt: (actual, expected) => actual < expected,
  matches: (actual, pattern) => {
    if (typeof actual === 'string') {
      return new RegExp(pattern).test(actual);
    }
    return false;
  }
};

// Format assertion messages
const formatAssertionMessage = (assertPath, type, value) => {
  const formats = {
    equals: `${assertPath} === ${value}`,
    contains: `${assertPath} contains "${value}"`,
    gt: `${assertPath} > ${value}`,
    lt: `${assertPath} < ${value}`,
    matches: `${assertPath} matches /${value}/`
  };
  return formats[type] || `${assertPath} ${type} ${value}`;
};

/**
 * Suite Runner - Runs test suites with shared setup/teardown
 */
class SuiteRunner {
  constructor(options = {}) {
    this.reporter = new Reporter();
    this.htmlReporter = options.html ? new HtmlReporter() : null;
    this.results = [];
    this.htmlOutput = options.htmlOutput;
  }

  /**
   * Run a test suite
   */
  async runSuite(suitePath) {
    const suiteName = path.basename(suitePath);
    logger.info(`\n📋 Running suite: ${suiteName}`);
    logger.info(SEPARATORS.THIN.repeat(SEPARATORS.LENGTH));

    try {
      // Load suite definition
      const suiteContent = await fs.readFile(suitePath, 'utf-8');
      const suite = JSON.parse(suiteContent);

      const suiteResult = {
        name: suite.name || suiteName,
        file: suitePath,
        tests: [],
        totalDuration: 0
      };

      // Track setup/teardown results for the report
      let setupResult = null;
      let teardownResult = null;
      let setupData = {};

      // Run setup if exists
      if (suite.setup && Array.isArray(suite.setup) && suite.setup.length > 0) {
        logger.info('\n🔧 Running setup...');
        logger.debug(`Setup blocks: ${suite.setup.map(s => s.id).join(', ')}`);

        const setupPipeline = PipelineBuilder.fromJSON({
          ...suite,
          pipeline: suite.setup
        });

        const { result, duration } = await measureTime(() =>
          setupPipeline.execute(suite.input || {})
        );

        setupResult = { success: result.success, duration };
        setupData = result.data; // Save setup output for tests to use

        if (!result.success) {
          logger.error('❌ Setup failed');
          logger.debug('Setup result:', result);
          suiteResult.setupError = result.error || 'Setup failed';
          suiteResult.success = false;
          this.results.push(suiteResult);
          return suiteResult;
        }

        logger.info('✅ Setup completed successfully');
        logger.debug('Setup output:', setupData);
      }

      // Run each test
      logger.info(`\n🚀 Running ${suite.tests?.length || 0} tests...`);

      for (let i = 0; i < (suite.tests || []).length; i++) {
        const test = suite.tests[i];
        logger.info(`\n→ [${i + 1}/${suite.tests.length}] ${test.id || `Test ${i + 1}`}`);

        try {
          // Build test pipeline with suite context and setup data
          const testPipeline = PipelineBuilder.fromJSON({
            ...suite,
            pipeline: test.pipeline || []
          });

          // Merge setup output with test input
          const testInput = {
            ...suite.input,
            ...setupData,
            ...test.input
          };

          const { result, duration } = await measureTime(() =>
            testPipeline.execute(testInput)
          );

          // Check assertions
          const assertions = this.checkAssertions(result, test.assertions);

          const testResult = {
            id: test.id || `test-${i}`,
            name: test.name || test.id || `Test ${i + 1}`,
            success: result.success && assertions.passed,
            duration,
            result,
            assertions,
            summary: testPipeline.getSummary()
          };

          suiteResult.tests.push(testResult);
          suiteResult.totalDuration += duration;

          // Report detailed test results to console
          this.reporter.reportTest(testResult);

          if (testResult.success) {
            logger.info(`  ✓ ${testResult.name} completed`);
          } else {
            logger.error(`  ✗ ${testResult.name} failed`);
          }
        } catch (error) {
          logger.error(`  ✗ Test failed with error: ${error.message}`);

          const testResult = {
            id: test.id || `test-${i}`,
            name: test.name || test.id || `Test ${i + 1}`,
            success: false,
            error: error.message,
            stack: error.stack
          };

          suiteResult.tests.push(testResult);

          // Report error details to console
          this.reporter.reportTest(testResult);
        }
      }

      // Always run teardown if exists (even if tests failed)
      if (suite.teardown && Array.isArray(suite.teardown) && suite.teardown.length > 0) {
        logger.info('\n🧹 Running teardown...');
        logger.debug(`Teardown blocks: ${suite.teardown.map(t => t.id).join(', ')}`);

        try {
          const teardownPipeline = PipelineBuilder.fromJSON({
            ...suite,
            pipeline: suite.teardown
          });

          // Pass setup data to teardown as well
          const teardownInput = {
            ...suite.input,
            ...setupData
          };

          const { result, duration } = await measureTime(() =>
            teardownPipeline.execute(teardownInput)
          );

          teardownResult = { success: result.success, duration };
          logger.info('✅ Teardown completed successfully');
          logger.debug('Teardown output:', result.data);
        } catch (teardownError) {
          logger.warn(`⚠️ Teardown failed: ${teardownError.message}`);
          logger.debug('Teardown error:', teardownError);
          teardownResult = { success: false, error: teardownError.message };
        }
      }

      // Calculate overall success
      suiteResult.success = suiteResult.tests.every(t => t.success);
      suiteResult.setupResult = setupResult;
      suiteResult.teardownResult = teardownResult;

      // Store and report
      this.results.push(suiteResult);
      this.reporter.reportSuite(suiteResult);

      return suiteResult;
    } catch (error) {
      logger.error(`❌ Suite failed with error: ${error.message}`);

      const errorResult = {
        name: suiteName,
        file: suitePath,
        success: false,
        error: error.message,
        stack: error.stack
      };

      this.results.push(errorResult);
      return errorResult;
    }
  }

  /**
   * Check test assertions
   */
  checkAssertions(result, assertions) {
    if (!assertions) {
      return { passed: true, checks: [] };
    }

    const checks = [];
    let allPassed = true;

    for (const [assertPath, expected] of Object.entries(assertions)) {
      const actual = getPath(result.data, assertPath);
      let passed = false;
      let message = '';

      if (typeof expected === 'object' && expected !== null) {
        // Complex assertion
        const messages = [];
        passed = true;

        for (const [type, value] of Object.entries(expected)) {
          if (ASSERTION_CHECKS[type]) {
            const checkPassed = ASSERTION_CHECKS[type](actual, value);
            if (!checkPassed) passed = false;
            messages.push(formatAssertionMessage(assertPath, type, value));
          }
        }

        message = messages.length > 0 ? messages.join(' AND ') : '';
      } else {
        // Simple equality
        passed = actual === expected;
        message = `${assertPath} === ${expected}`;
      }

      checks.push({
        path: assertPath,
        expected,
        actual,
        passed,
        message
      });

      if (!passed) {
        allPassed = false;
      }
    }

    return {
      passed: allPassed,
      checks
    };
  }

  /**
   * Run multiple suites in batch
   */
  async runBatch(filePaths) {
    logger.info(`\n🚀 Running ${filePaths.length} test suites\n`);

    const batchResults = {
      suites: [],
      totalDuration: 0,
      started: new Date().toISOString()
    };

    for (const filePath of filePaths) {
      const { result, duration } = await measureTime(() => this.runSuite(filePath));
      batchResults.suites.push(result);
      batchResults.totalDuration += duration;
    }

    batchResults.finished = new Date().toISOString();

    // Console report
    this.reporter.reportBatchSummary(batchResults);

    // Generate HTML report if enabled
    if (this.htmlReporter) {
      await this.htmlReporter.generateReport(batchResults, this.htmlOutput);
      logger.info(`\n📄 HTML report generated: ${this.htmlOutput}`);
    }

    return batchResults;
  }
}

/**
 * CLI Entry Point
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse CLI options
  const options = {
    html: false,
    htmlOutput: 'test-report.html'
  };

  const testFiles = [];
  let i = 0;

  while (i < args.length) {
    if (args[i] === '--html') {
      options.html = true;
      i++;
      // Check if next arg is --output
      if (i < args.length && args[i] === '--output') {
        i++;
        if (i < args.length) {
          options.htmlOutput = args[i];
          i++;
        }
      }
    } else if (!args[i].startsWith('--')) {
      testFiles.push(args[i]);
      i++;
    } else {
      i++;
    }
  }

  // Default HTML output filename if not specified
  if (options.html && !options.htmlOutput) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    options.htmlOutput = `test-results-${timestamp}.html`;
  }

  const runner = new SuiteRunner(options);

  if (testFiles.length === 0) {
    // Run all suites in examples directory
    const examplesDir = path.join(__dirname, '..', 'examples');
    const files = await fs.readdir(examplesDir);
    const suiteFiles = files.filter(f => f.endsWith('.json'));

    const filePaths = suiteFiles.map(f => path.join(examplesDir, f));
    await runner.runBatch(filePaths);
  } else if (testFiles.length === 1) {
    // Run single suite
    const suitePath = path.resolve(testFiles[0]);
    const result = await runner.runSuite(suitePath);

    // Generate HTML report for single suite if enabled
    if (runner.htmlReporter) {
      const batchResults = {
        suites: [result],
        totalDuration: result.totalDuration,
        started: new Date().toISOString(),
        finished: new Date().toISOString()
      };
      await runner.htmlReporter.generateReport(batchResults, runner.htmlOutput);
      logger.info(`\n📄 HTML report generated: ${runner.htmlOutput}`);
    }
  } else {
    // Run multiple suites
    const filePaths = testFiles.map(f => path.resolve(f));
    await runner.runBatch(filePaths);
  }

  // Exit with appropriate code
  const allPassed = runner.results.every(r => r.success);
  process.exit(allPassed ? 0 : 1);
}

// Run if called directly
// Resolve symlinks to handle npx execution via node_modules/.bin/
if (process.argv[1]) {
  const scriptPath = fileURLToPath(import.meta.url);
  const argPath = fsSync.realpathSync(process.argv[1]);

  if (scriptPath === argPath) {
    main().catch(err => logger.error('Fatal error', err));
  }
}

export { SuiteRunner };
