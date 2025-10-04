import { Block } from '../../src/core/Block.js';
import { LIMITS } from '../../src/utils/constants.js';

/**
 * Loop - Signals pipeline to loop back to a previous block
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
      produces: ['_loopTo', '_maxLoops']
    };
  }

  process(inputs, _context) {
    const { target, maxIterations = LIMITS.MAX_LOOP_ITERATIONS } = this.config;

    // Simply signal pipeline to loop back - let Pipeline handle counting
    return {
      ...inputs,
      _loopTo: target,
      _maxLoops: maxIterations
    };
  }
}
