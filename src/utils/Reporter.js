import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { LIMITS, SEPARATORS } from './constants.js';
import { logger } from './logger.js';

/**
 * Reporter - Formats and outputs test results
 */
export class Reporter {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.outputFile = options.outputFile;
  }

  /**
   * Calculate test statistics
   */
  getStats(results) {
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : 0;
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

    return {
      passed,
      failed,
      total,
      passRate,
      totalDuration
    };
  }

  /**
   * Report single test result
   */
  reportTest(result) {
    this.reportTestConsole(result);
  }

  /**
   * Console reporter for single test
   */
  reportTestConsole(result) {
    const icon = result.success ? '✅' : '❌';
    const status = result.success ? chalk.green('PASSED') : chalk.red('FAILED');

    logger.report(`\n${icon} Test: ${chalk.bold(result.name)} - ${status}`);

    if (result.duration) {
      logger.report(`⏱  Duration: ${result.duration}ms`);
    }

    // Report assertions
    if (result.assertions && result.assertions.checks) {
      logger.report('\n📊 Assertions:');
      for (const check of result.assertions.checks) {
        const checkIcon = check.passed ? '✓' : '✗';
        const checkColor = check.passed ? chalk.green : chalk.red;
        logger.report(`  ${checkColor(checkIcon)} ${check.message}`);
        if (!check.passed && this.verbose) {
          logger.report(`     Expected: ${JSON.stringify(check.expected)}`);
          logger.report(`     Actual: ${JSON.stringify(check.actual)}`);
        }
      }
    }

    // Report AI Response and Tools (if available)
    if (result.result?.data) {
      const parsedBlocks = Object.keys(result.result.data).filter(k =>
        k.toLowerCase().includes('parse') || k.toLowerCase().includes('parsed')
      );

      for (const parsedKey of parsedBlocks) {
        const parsedData = result.result.data[parsedKey];

        // Show AI response text
        if (parsedData?.text) {
          logger.report('\n🤖 AI Response:');
          // Truncate if too long
          const displayText = parsedData.text.length > 300 ?
            `${parsedData.text.substring(0, 300)}...` :
            parsedData.text;
          logger.report(`  "${displayText}"`);
        }

        // Show tools used
        if (parsedData?.toolCalls && parsedData.toolCalls.length > 0) {
          logger.report('\n🔧 Tools Used:');
          for (const tool of parsedData.toolCalls) {
            let toolDisplay = `  • ${tool.name || tool.toolName}`;
            if (tool.arguments) {
              // Truncate arguments if too long
              const argStr = JSON.stringify(tool.arguments);
              const argDisplay = argStr.length > 100 ?
                `${argStr.substring(0, 100)}...` :
                argStr;
              toolDisplay += `(${argDisplay})`;
            }
            logger.report(toolDisplay);
          }
        }
      }

      // Report judge reasoning (if present)
      const judgeBlocks = Object.keys(result.result.data).filter(k => k.toLowerCase().includes('judge'));
      for (const judgeKey of judgeBlocks) {
        const judgeData = result.result.data[judgeKey];
        if (judgeData?.reasoning) {
          logger.report('\n🧑‍⚖️ Judge Analysis:');
          logger.report(`  Score: ${judgeData.score || 0}`);
          logger.report(`  Reasoning: ${judgeData.reasoning}`);
          if (judgeData.details) {
            logger.report(`  Details: ${JSON.stringify(judgeData.details, null, 2)}`);
          }
        }
      }
    }

    // Report AI tool failures (from parsed responses)
    if (result.result?.data) {
      // Look for parsed blocks that might contain tool errors
      const parsedBlocks = Object.keys(result.result.data).filter(k => k.toLowerCase().includes('parsed'));
      for (const parsedKey of parsedBlocks) {
        const parsedData = result.result.data[parsedKey];
        if (parsedData?.toolErrors && parsedData.toolErrors.length > 0) {
          logger.report('\n🔧 AI Tool Execution Errors:');
          for (const toolError of parsedData.toolErrors) {
            logger.report(chalk.red(`  ✗ ${toolError.toolName}: ${toolError.error}`));
            if (toolError.toolCallId) {
              logger.report(chalk.gray(`     Tool Call ID: ${toolError.toolCallId}`));
            }
          }
        }
      }
    }

    // Report pipeline summary
    if (result.summary) {
      logger.report('\n📈 Pipeline Summary:');
      logger.report(`  Blocks executed: ${result.summary.executed}/${result.summary.totalBlocks}`);
      logger.report(`  Succeeded: ${result.summary.succeeded}`);
      if (result.summary.failed > 0) {
        logger.report(chalk.red(`  Failed: ${result.summary.failed}`));
      }
      logger.report(`  Total time: ${result.summary.totalDuration}ms`);

      // Report failed blocks specifically
      if (result.summary.blockResults && result.summary.blockResults.length > 0) {
        const failedBlocks = result.summary.blockResults.filter(b => !b.success);
        if (failedBlocks.length > 0) {
          logger.report('\n❌ Failed Blocks:');
          for (const block of failedBlocks) {
            logger.report(chalk.red(`  ✗ ${block.id} (${block.type || 'unknown'}): ${block.error}`));
            // Show more details about the failure
            if (block.inputs) {
              logger.report(chalk.gray(`     Input: ${JSON.stringify(block.inputs).substring(0, 100)}...`));
            }
            if (block.duration) {
              logger.report(chalk.gray(`     Failed after: ${block.duration}ms`));
            }
          }
          // Show if execution was stopped early
          if (result.summary.executed < result.summary.totalBlocks) {
            logger.report(chalk.yellow(`\n  ⚠️  Pipeline stopped early at block ${result.summary.executed} of ${result.summary.totalBlocks}`));
            logger.report(chalk.yellow(`      Remaining blocks were not executed due to failure`));
          }
        }
      }
    }

    // Report errors
    if (result.error) {
      logger.report(chalk.red(`\n⚠️  Error: ${result.error}`));
      if (this.verbose && result.stack) {
        logger.report(chalk.gray(result.stack));
      }
    }

    // Report key outputs
    if (this.verbose && result.result?.data) {
      logger.report('\n📤 Key Outputs:');
      const { data } = result.result;

      // Show selected outputs
      const keysToShow = ['text', 'score', 'passed', 'toolCalls', 'status'];
      for (const key of keysToShow) {
        if (data[key] !== undefined) {
          let value = data[key];
          if (typeof value === 'string' && value.length > LIMITS.STRING_PREVIEW_LENGTH) {
            value = `${value.substring(0, LIMITS.STRING_PREVIEW_LENGTH)}...`;
          }
          logger.report(`  ${key}: ${JSON.stringify(value)}`);
        }
      }
    }
  }

  /**
   * Report suite results
   */
  reportSuite(suiteResult) {
    const status = suiteResult.success ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED');
    const passed = suiteResult.tests?.filter(t => t.success).length || 0;
    const failed = suiteResult.tests?.filter(t => !t.success).length || 0;

    logger.report(`\n${status} Suite: ${suiteResult.name}`);
    logger.report(`⏱  Total duration: ${suiteResult.totalDuration}ms`);
    logger.report(`📊 Tests: ${passed} passed, ${failed} failed, ${suiteResult.tests?.length || 0} total`);

    // Show individual test results
    if (suiteResult.tests && suiteResult.tests.length > 0) {
      logger.report('\n📝 Test Results:');
      for (const test of suiteResult.tests) {
        const icon = test.success ? '✓' : '✗';
        const color = test.success ? chalk.green : chalk.red;
        logger.report(`  ${color(icon)} ${test.name} (${test.duration}ms)`);

        // Show failed assertions
        if (!test.success && test.assertions?.checks) {
          const failedChecks = test.assertions.checks.filter(c => !c.passed);
          for (const check of failedChecks) {
            logger.report(chalk.red(`     ✗ ${check.message}`));
            if (this.verbose) {
              logger.report(`        Expected: ${JSON.stringify(check.expected)}`);
              logger.report(`        Actual: ${JSON.stringify(check.actual)}`);
            }
          }
        }
      }
    }

    // Show errors if any
    if (suiteResult.error) {
      logger.report(chalk.red(`\n⚠️  Suite Error: ${suiteResult.error}`));
    }
  }

  /**
   * Report batch summary
   */
  reportBatchSummary(batchResults) {
    logger.report(`\n${SEPARATORS.THICK.repeat(SEPARATORS.LENGTH)}`);
    logger.report(chalk.bold.cyan('📊 BATCH TEST SUMMARY'));
    logger.report(SEPARATORS.THICK.repeat(SEPARATORS.LENGTH));

    const totalSuites = batchResults.suites.length;
    const passedSuites = batchResults.suites.filter(s => s.success).length;
    const failedSuites = batchResults.suites.filter(s => !s.success).length;

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const suite of batchResults.suites) {
      if (suite.tests) {
        totalTests += suite.tests.length;
        passedTests += suite.tests.filter(t => t.success).length;
        failedTests += suite.tests.filter(t => !t.success).length;
      }
    }

    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    logger.report(`\n📋 Suites: ${passedSuites} passed, ${failedSuites} failed, ${totalSuites} total`);
    logger.report(`🧪 Tests: ${passedTests} passed, ${failedTests} failed, ${totalTests} total`);
    logger.report(`📈 Pass Rate: ${passRate}%`);
    logger.report(`⏱  Total Duration: ${Math.round(batchResults.totalDuration / 1000)}s`);

    // Show failed suites
    const failed = batchResults.suites.filter(s => !s.success);
    if (failed.length > 0) {
      logger.report(chalk.red('\n❌ Failed Suites:'));
      for (const suite of failed) {
        logger.report(chalk.red(`  • ${suite.name}`));
        if (suite.setupError) {
          logger.report(chalk.red(`    Setup failed: ${suite.setupError}`));
        }
        if (suite.tests) {
          const suiteFailedTests = suite.tests.filter(t => !t.success);
          for (const test of suiteFailedTests) {
            logger.report(chalk.red(`    ✗ ${test.name}`));
          }
        }
      }
    }

    logger.report(`\n${SEPARATORS.THICK.repeat(SEPARATORS.LENGTH)}\n`);
  }

  /**
   * Report final summary
   */
  async reportSummary(results) {
    logger.report(`\n${SEPARATORS.THICK.repeat(SEPARATORS.LENGTH)}`);
    logger.report(chalk.bold.cyan('📊 TEST SUMMARY'));
    logger.report(SEPARATORS.THICK.repeat(SEPARATORS.LENGTH));

    const { passed, failed, total, passRate, totalDuration } = this.getStats(results);

    logger.report(`\nTotal Tests: ${total}`);
    logger.report(chalk.green(`✅ Passed: ${passed}`));
    if (failed > 0) {
      logger.report(chalk.red(`❌ Failed: ${failed}`));
    }
    logger.report(`📈 Pass Rate: ${passRate}%`);
    logger.report(`⏱  Total Duration: ${totalDuration}ms`);

    // List failed tests
    if (failed > 0) {
      logger.report(chalk.red('\n❌ Failed Tests:'));
      for (const result of results.filter(r => !r.success)) {
        logger.report(`  - ${result.name}`);
        if (result.error) {
          logger.report(chalk.gray(`    ${result.error}`));
        }
      }
    }

    // Save results to file if requested
    if (this.outputFile) {
      await this.saveResults(results);
    }

    // Final status
    logger.report(`\n${SEPARATORS.THICK.repeat(SEPARATORS.LENGTH)}`);
    if (failed === 0) {
      logger.report(chalk.green.bold('✨ ALL TESTS PASSED! ✨'));
    } else {
      logger.report(chalk.red.bold(`⚠️  ${failed} TEST${failed > 1 ? 'S' : ''} FAILED`));
    }
    logger.report(`${SEPARATORS.THICK.repeat(SEPARATORS.LENGTH)}\n`);
  }

  /**
   * Save results to file
   */
  async saveResults(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = this.outputFile || `results/test-results-${timestamp}.json`;

    const { passed, failed, total } = this.getStats(results);
    const output = {
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed
      },
      results: results.map(r => ({
        name: r.name,
        file: r.file,
        success: r.success,
        duration: r.duration,
        error: r.error,
        assertions: r.assertions,
        summary: r.summary
      }))
    };

    // Ensure directory exists
    const dir = path.dirname(fileName);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fileName, JSON.stringify(output, null, 2));
    logger.report(`\n💾 Results saved to: ${fileName}`);
  }
}
