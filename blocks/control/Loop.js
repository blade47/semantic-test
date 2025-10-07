import { Block } from '../../src/core/Block.js';
import { LIMITS } from '../../src/utils/constants.js';
import { evaluateCondition } from '../../src/utils/conditions.js';

/**
 * Loop - Conditionally signals pipeline to loop back to a previous block
 *
 * If condition is provided, loops while condition is true (up to maxIterations)
 * If no condition, always loops maxIterations times
 */
export class Loop extends Block {
  static get inputs() {
    return {
      required: [],
      optional: ['*']
    };
  }

  static get outputs() {
    return {
      produces: ['_loopTo', '_maxLoops', '_shouldLoop']
    };
  }

  process(inputs, _context) {
    const { target, maxIterations = LIMITS.MAX_LOOP_ITERATIONS, condition } = this.config;

    // Evaluate condition if provided, otherwise always loop
    const shouldLoop = condition ? evaluateCondition(inputs, condition) : true;

    if (shouldLoop) {
      return {
        ...inputs,
        _loopTo: target,
        _maxLoops: maxIterations,
        _shouldLoop: true
      };
    }

    // Condition not met - don't loop
    return {
      ...inputs,
      _shouldLoop: false
    };
  }
}
