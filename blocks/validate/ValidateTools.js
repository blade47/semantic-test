import { Block } from '../../src/core/Block.js';
import { ensureArray } from '../../src/utils/array.js';
import { SCORE_MULTIPLIERS } from '../../src/utils/constants.js';

/**
 * ValidateTools - Validates tool usage
 */
export class ValidateTools extends Block {
  static get inputs() {
    return {
      required: ['toolCalls'],
      optional: []
    };
  }

  static get outputs() {
    return {
      produces: ['passed', 'failures', 'score', 'actualTools', 'expectedTools']
    };
  }

  process(inputs, _context) {
    const { toolCalls = [] } = inputs;
    const { config } = this;

    // Ensure toolCalls is an array
    const toolCallsArray = Array.isArray(toolCalls) ? toolCalls : [];
    const actualTools = toolCallsArray.map(t => t.name || t.toolName);
    const results = {
      passed: true,
      failures: [],
      score: 1.0,
      actualTools,
      expectedTools: config.expected || []
    };

    // Check expected tools
    if (config.expected) {
      const expected = ensureArray(config.expected);
      const missing = expected.filter(exp => !actualTools.includes(exp));

      if (missing.length > 0) {
        results.passed = false;
        results.failures.push(`Missing expected tools: ${missing.join(', ')}`);
        results.score *= (expected.length - missing.length) / expected.length;
      }

      results.expectedTools = expected;
    }

    // Check forbidden tools
    if (config.forbidden) {
      const forbidden = ensureArray(config.forbidden);
      const used = forbidden.filter(f => actualTools.includes(f));

      if (used.length > 0) {
        results.passed = false;
        results.failures.push(`Used forbidden tools: ${used.join(', ')}`);
        results.score *= SCORE_MULTIPLIERS.FORBIDDEN_TOOL;
      }
    }

    // Check tool count
    if (config.minTools && actualTools.length < config.minTools) {
      results.passed = false;
      results.failures.push(`Too few tools: ${actualTools.length} < ${config.minTools}`);
      results.score *= SCORE_MULTIPLIERS.TOO_FEW_TOOLS;
    }

    if (config.maxTools && actualTools.length > config.maxTools) {
      results.passed = false;
      results.failures.push(`Too many tools: ${actualTools.length} > ${config.maxTools}`);
      results.score *= SCORE_MULTIPLIERS.TOO_MANY_TOOLS;
    }

    // Check tool order (if specified)
    if (config.order) {
      const expectedOrder = ensureArray(config.order);
      let orderCorrect = true;
      let correctPositions = 0;

      // Check if we have the right number of tools
      if (actualTools.length !== expectedOrder.length) {
        orderCorrect = false;
        results.failures.push(
          `Tool count mismatch. Expected ${expectedOrder.length} tools, got ${actualTools.length}`
        );
      }

      // Check each position
      for (let i = 0; i < expectedOrder.length; i++) {
        if (i < actualTools.length && actualTools[i] === expectedOrder[i]) {
          correctPositions++;
        } else {
          orderCorrect = false;
        }
      }

      if (!orderCorrect) {
        results.passed = false;
        results.failures.push(
          `Tool order incorrect. Expected: [${expectedOrder.join(', ')}], Got: [${actualTools.join(', ')}]`
        );
        // Score based on how many are in correct position
        const orderScore = expectedOrder.length > 0 ? correctPositions / expectedOrder.length : 0;
        results.score *= Math.max(orderScore, SCORE_MULTIPLIERS.INCORRECT_ORDER);
      }

      // When using order, set expectedTools to match
      results.expectedTools = expectedOrder;
    }

    // Check tool arguments (if specified)
    if (config.validateArgs && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const expectedArgs = config.validateArgs[toolCall.name];
        if (expectedArgs) {
          for (const [key, expectedValue] of Object.entries(expectedArgs)) {
            const actualValue = toolCall.args?.[key];
            if (actualValue !== expectedValue) {
              results.passed = false;
              results.failures.push(
                `Tool '${toolCall.name}' arg '${key}' mismatch. Expected: ${expectedValue}, Got: ${actualValue}`
              );
              results.score *= SCORE_MULTIPLIERS.ARG_MISMATCH;
            }
          }
        }
      }
    }

    return results;
  }
}
