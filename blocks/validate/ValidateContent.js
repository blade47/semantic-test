import { Block } from '../../src/core/Block.js';
import { ensureArray } from '../../src/utils/array.js';
import { SCORE_MULTIPLIERS } from '../../src/utils/constants.js';

/**
 * ValidateContent - Validates text content
 */
export class ValidateContent extends Block {
  static get inputs() {
    return {
      required: [],
      optional: ['text']
    };
  }

  static get outputs() {
    return {
      produces: ['passed', 'failures', 'score']
    };
  }

  process(inputs, _context) {
    const { text } = inputs;
    const { config } = this;

    const results = {
      passed: true,
      failures: [],
      score: 1.0,
      checks: {}
    };

    // Handle missing or undefined text
    if (text === undefined || text === null) {
      results.passed = false;
      results.failures.push('Missing required input: text');
      results.score = 0;
      return results;
    }

    // Check if text contains expected strings
    if (config.contains) {
      const expected = ensureArray(config.contains);
      const missing = [];

      for (const exp of expected) {
        const found = text.toLowerCase().includes(exp.toLowerCase());
        results.checks[`contains_${exp}`] = found;
        if (!found) {
          missing.push(exp);
        }
      }

      if (missing.length > 0) {
        results.passed = false;
        results.failures.push(`Missing expected content: ${missing.join(', ')}`);
        results.score *= (expected.length - missing.length) / expected.length;
      }
    }

    // Check if text does NOT contain certain strings
    if (config.notContains) {
      const forbidden = ensureArray(config.notContains);
      const found = [];

      for (const forbid of forbidden) {
        if (text.toLowerCase().includes(forbid.toLowerCase())) {
          found.push(forbid);
        }
      }

      if (found.length > 0) {
        results.passed = false;
        results.failures.push(`Found forbidden content: ${found.join(', ')}`);
        results.score *= SCORE_MULTIPLIERS.FORBIDDEN_CONTENT;
      }
    }

    // Check text length
    if (config.minLength && text.length < config.minLength) {
      results.passed = false;
      results.failures.push(`Text too short: ${text.length} < ${config.minLength}`);
      results.score *= SCORE_MULTIPLIERS.LENGTH_TOO_SHORT;
    }

    if (config.maxLength && text.length > config.maxLength) {
      results.passed = false;
      results.failures.push(`Text too long: ${text.length} > ${config.maxLength}`);
      results.score *= SCORE_MULTIPLIERS.LENGTH_TOO_LONG;
    }

    // Check regex patterns
    if (config.matches) {
      const pattern = new RegExp(config.matches, config.matchFlags || 'i');
      if (!pattern.test(text)) {
        results.passed = false;
        results.failures.push(`Text doesn't match pattern: ${config.matches}`);
        results.score *= SCORE_MULTIPLIERS.PATTERN_MISMATCH;
      }
    }

    return results;
  }
}
