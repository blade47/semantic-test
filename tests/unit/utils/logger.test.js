import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { logger } from '../../../src/utils/logger.js';

describe('logger', () => {
  let originalEnv;
  let consoleOutput;
  let originalConsole;

  beforeEach(() => {
    originalEnv = process.env.LOG_LEVEL;
    consoleOutput = {
      log: [],
      error: [],
      warn: []
    };
    originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn
    };

    // Mock console methods
    console.log = (...args) => consoleOutput.log.push(args.map(a => String(a)).join(' '));
    console.error = (...args) => consoleOutput.error.push(args.map(a => String(a)).join(' '));
    console.warn = (...args) => consoleOutput.warn.push(args.map(a => String(a)).join(' '));
  });

  afterEach(() => {
    // Restore original values
    if (originalEnv !== undefined) {
      process.env.LOG_LEVEL = originalEnv;
    } else {
      delete process.env.LOG_LEVEL;
    }
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
  });

  describe('log levels', () => {
    test('should log DEBUG messages when LOG_LEVEL=DEBUG', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      logger.debug('Debug message');
      assert.ok(consoleOutput.log.some(msg => msg.includes('Debug message')));
    });

    test('should not log DEBUG messages when LOG_LEVEL=INFO', () => {
      process.env.LOG_LEVEL = 'INFO';
      logger.debug('Debug message');
      assert.strictEqual(consoleOutput.log.length, 0);
    });

    test('should log INFO messages when LOG_LEVEL=INFO', () => {
      process.env.LOG_LEVEL = 'INFO';
      logger.info('Info message');
      assert.ok(consoleOutput.log.some(msg => msg.includes('Info message')));
    });

    test('should log WARN messages when LOG_LEVEL=WARN', () => {
      process.env.LOG_LEVEL = 'WARN';
      logger.warn('Warning message');
      assert.ok(consoleOutput.warn.some(msg => msg.includes('Warning message')));
    });

    test('should log ERROR messages at any level', () => {
      process.env.LOG_LEVEL = 'ERROR';
      logger.error('Error message');
      assert.ok(consoleOutput.error.some(msg => msg.includes('Error message')));
    });

    test('should always log REPORT messages', () => {
      process.env.LOG_LEVEL = 'ERROR';
      logger.report('Report message');
      assert.ok(consoleOutput.log.some(msg => msg.includes('Report message')));
    });
  });

  describe('message formatting', () => {
    test('should format multiple arguments', () => {
      process.env.LOG_LEVEL = 'INFO';
      logger.info('Message', 'with', 'parts');
      assert.ok(consoleOutput.log.some(msg =>
        msg.includes('Message') && msg.includes('with') && msg.includes('parts')
      ));
    });

    test('should handle objects', () => {
      process.env.LOG_LEVEL = 'INFO';
      const obj = { key: 'value' };
      logger.info('Object:', obj);
      assert.ok(consoleOutput.log.some(msg => msg.includes('[object Object]')));
    });

    test('should handle null and undefined', () => {
      process.env.LOG_LEVEL = 'INFO';
      logger.info('Values:', null, undefined);
      assert.ok(consoleOutput.log.some(msg =>
        msg.includes('null') || msg.includes('undefined')
      ));
    });
  });

  describe('level hierarchy', () => {
    test('DEBUG should show all levels', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      assert.ok(consoleOutput.log.some(msg => msg.includes('debug')));
      assert.ok(consoleOutput.log.some(msg => msg.includes('info')));
      assert.ok(consoleOutput.warn.some(msg => msg.includes('warn')));
      assert.ok(consoleOutput.error.some(msg => msg.includes('error')));
    });

    test('WARN should not show INFO or DEBUG', () => {
      process.env.LOG_LEVEL = 'WARN';
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      assert.strictEqual(consoleOutput.log.filter(msg => msg.includes('debug')).length, 0);
      assert.strictEqual(consoleOutput.log.filter(msg => msg.includes('info')).length, 0);
      assert.ok(consoleOutput.warn.some(msg => msg.includes('warn')));
      assert.ok(consoleOutput.error.some(msg => msg.includes('error')));
    });
  });

  test('should default to INFO level when LOG_LEVEL not set', () => {
    delete process.env.LOG_LEVEL;
    logger.debug('debug');
    logger.info('info');

    assert.strictEqual(consoleOutput.log.filter(msg => msg.includes('debug')).length, 0);
    assert.ok(consoleOutput.log.some(msg => msg.includes('info')));
  });
});
