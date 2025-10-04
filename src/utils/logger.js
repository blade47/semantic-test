/**
 * Simple logger utility - KISS principle
 * Provides consistent logging with minimal complexity
 */

const LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  // Check log level dynamically from environment
  getLevel() {
    const level = process.env.LOG_LEVEL || 'INFO';
    return LEVELS[level.toUpperCase()] ?? LEVELS.INFO;
  }

  error(...args) {
    if (this.getLevel() >= LEVELS.ERROR) {
      console.error('[ERROR]', ...args);
    }
  }

  warn(...args) {
    if (this.getLevel() >= LEVELS.WARN) {
      console.warn('[WARN]', ...args);
    }
  }

  info(...args) {
    if (this.getLevel() >= LEVELS.INFO) {
      console.log(...args);
    }
  }

  debug(...args) {
    if (this.getLevel() >= LEVELS.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  }

  /**
   * Report method for user-facing output that should always be shown
   * Used for test results, summaries, and other formatted output
   * Not affected by log level - always outputs
   */
  report(message) {
    console.log(message);
  }
}

// Single instance
export const logger = new Logger();
