import { DataBus } from './DataBus.js';
import { Context } from './Context.js';
import { logger } from '../utils/logger.js';
import { measureTime } from '../utils/timing.js';
import { LIMITS } from '../utils/constants.js';

/**
 * Pipeline - Orchestrates the execution of blocks
 */
export class Pipeline {
  constructor(blocks = []) {
    this.blocks = blocks;
    this.dataBus = new DataBus();
    this.context = new Context();
    this.executionSummary = null;
  }

  /**
   * Add a block to the pipeline
   * @param {Block} block - Block instance to add
   * @returns {Pipeline} This pipeline for chaining
   */
  add(block) {
    this.blocks.push(block);
    return this;
  }

  /**
   * Store block execution metadata in the data bus
   * @param {string} blockId - Block identifier
   * @param {boolean} success - Whether execution succeeded
   * @param {number} duration - Execution time in ms
   * @param {string|null} error - Error message if failed
   */
  storeBlockMetadata(blockId, success, duration = 0, error = null) {
    const metadata = {
      timestamp: Date.now(),
      success
    };
    if (duration) metadata.duration = duration;
    if (error) metadata.error = error;
    this.dataBus.set(`_meta.${blockId}`, metadata);
  }

  /**
   * Update execution summary for block result
   */
  updateExecutionSummary(success, duration = 0) {
    this.executionSummary.executed++;
    if (success) {
      this.executionSummary.succeeded++;
      this.executionSummary.totalDuration += duration;
    } else {
      this.executionSummary.failed++;
      this.executionSummary.hasErrors = true;
    }
  }

  /**
   * Handle block error consistently
   */
  handleBlockError(block, error, duration = 0, shouldThrow = true) {
    const errorMessage = error.message || error;

    // Store error data
    this.dataBus.set('_error', errorMessage);
    this.storeBlockMetadata(block.id, false, duration, errorMessage);
    this.updateExecutionSummary(false);

    // Track block failure
    this.executionSummary.blockResults.push({
      id: block.id,
      success: false,
      duration,
      error: errorMessage
    });

    // Log error with visual indicator
    logger.error(`  ✗ ${block.id} failed: ${errorMessage}`);

    // Check if we should continue
    if (shouldThrow && !this.context.get('continueOnError')) {
      throw error.message ? error : new Error(errorMessage);
    }

    return true; // Signal to break the loop
  }

  /**
   * Execute a single block
   * @param {Block} block - Block to execute
   * @param {number} index - Block index in pipeline
   * @returns {Promise<Object>} Result with output, duration, and error
   */
  executeBlock(block, index) {
    logger.info(`→ [${index + 1}/${this.blocks.length}] ${block.id}`);
    const inputs = this.gatherInputs(block);

    // Log inputs in debug mode
    logger.debug(`  Inputs for '${block.id}':`, inputs);

    return measureTime(() => block.execute(inputs, this.context));
  }

  /**
   * Handle successful block execution
   * @param {Block} block - Block that succeeded
   * @param {*} output - Block output
   * @param {number} duration - Execution duration in ms
   */
  handleBlockSuccess(block, output, duration) {
    this.storeOutput(block, output);

    // Log output in debug mode
    logger.debug(`  Output from '${block.id}':`, output);
    logger.debug(`  Duration: ${duration}ms`);

    this.storeBlockMetadata(block.id, true, duration);
    this.updateExecutionSummary(true, duration);

    // Track block result
    this.executionSummary.blockResults.push({
      id: block.id,
      success: true,
      duration
    });

    // Show success indicator
    logger.info(`  ✓ ${block.id} completed`);
  }

  /**
   * Check flow control signals in output
   * @param {*} output - Block output to check
   * @param {number} currentIndex - Current block index
   * @returns {Object} Flow control action and optional new index
   */
  checkFlowControl(output, currentIndex) {
    // Check for termination signal
    if (output && output._terminate) {
      logger.info(`✓ Pipeline terminated by ${this.blocks[currentIndex].id}`);
      return { action: 'break' };
    }

    // Check for loop back
    if (output && output._loopTo !== undefined) {
      const newIndex = this.handleLoop(output._loopTo, currentIndex, output._maxLoops);
      if (newIndex !== null) {
        return { action: 'loop', newIndex };
      }
    }

    return { action: 'continue' };
  }

  /**
   * Execute the pipeline with all blocks in sequence
   * @param {Object} initialInput - Initial input data
   * @param {Object} initialContext - Initial context values
   * @returns {Promise<Object>} Execution result with data, context, success flag
   */
  async execute(initialInput = {}, initialContext = {}) {
    // Initialize execution summary
    this.executionSummary = {
      totalBlocks: this.blocks.length,
      executed: 0,
      succeeded: 0,
      failed: 0,
      totalDuration: 0,
      hasErrors: false,
      blockResults: [] // Track individual block results
    };

    // Initialize context
    this.context.merge(initialContext);

    // Set initial input
    if (initialInput) {
      this.dataBus.set('input', initialInput);
    }

    // Execute blocks in sequence
    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i];

      try {
        // Execute the block
        const { result: output, duration, error } = await this.executeBlock(block, i);

        // Check if block threw an error
        if (error) {
          // Don't throw here - let it be handled once
          if (this.handleBlockError(block, error, duration, false)) break;
          continue; // Skip to next iteration
        }

        // Check if block returned an error
        if (output?.error) {
          this.storeOutput(block, output); // Store output before handling error
          // Note: output.error case doesn't throw, just breaks
          this.dataBus.set('_error', output.error);
          this.storeBlockMetadata(block.id, false, duration, output.error);
          this.updateExecutionSummary(false);
          // Track block failure
          this.executionSummary.blockResults.push({
            id: block.id,
            success: false,
            duration,
            error: output.error
          });

          logger.error(`  ✗ ${block.id} failed: ${output.error}`);
          break;
        }

        // Handle successful execution
        this.handleBlockSuccess(block, output, duration);

        // Check flow control (termination, loops)
        const flow = this.checkFlowControl(output, i);
        if (flow.action === 'break') {
          break;
        } else if (flow.action === 'loop') {
          i = flow.newIndex;
        }
      } catch (error) {
        if (this.handleBlockError(block, error, 0, false)) {
          break;
        }
      }
    }

    const result = {
      data: this.dataBus.toObject(),
      context: this.context.toObject(),
      success: !this.executionSummary.hasErrors
    };

    // Include error if present
    if (this.dataBus.has('_error')) {
      result.error = this.dataBus.get('_error');
    }

    return result;
  }

  /**
   * Gather inputs for a block based on its configuration
   * Supports three input formats:
   * 1. String format: "${slot.path}" - resolves to { body: value }
   * 2. Object with from/as: { from: 'slot', as: 'name' } - resolves to { name: value }
   * 3. Direct object: { key: value } - deep resolves all values
   */
  gatherInputs(block) {
    // Support both block.config.input and block.input formats
    const config = block.config || block;
    let inputs = {};

    // Format 1: String input (e.g., "${response.body}")
    if (config.input && typeof config.input === 'string') {
      logger.debug(`  Resolving string input: ${config.input}`);
      const value = this.resolveValue(config.input);
      // For blocks expecting 'body', pass as body parameter
      inputs = { body: value };
    } else if (config.input && typeof config.input === 'object' && config.input.from) {
      // Format 2: Object with from/as keys
      logger.debug(`  Resolving from/as input: from='${config.input.from}' as='${config.input.as}'`);
      // Treat 'from' as a direct path to look up in the DataBus
      // This ensures undefined paths return undefined instead of the literal string
      const value = this.dataBus.get(config.input.from);
      inputs = config.input.as ? { [config.input.as]: value } : value;
    } else if (config.input && typeof config.input === 'object') {
      // Format 3: Direct input object
      logger.debug(`  Resolving object input:`, config.input);
      inputs = this.deepResolve(config.input);
    } else {
      // No explicit inputs - pass entire data bus
      logger.debug(`  No explicit inputs - using entire data bus`);
      inputs = this.dataBus.toObject();
    }

    // Merge config properties (like format, timeout, etc.) into inputs
    // This ensures block config is passed to the process() method
    if (config.config && typeof config.config === 'object') {
      logger.debug(`  Merging block config:`, config.config);
      inputs = { ...inputs, ...config.config };
    }

    return inputs;
  }

  /**
   * Store block output based on configuration
   * Supports three output formats:
   * 1. Object mapping: { "field": "slot" } - maps output fields to slots
   * 2. String format: "slotName" - stores entire output in named slot
   * 3. Default: uses block ID as slot name
   */
  storeOutput(block, output) {
    if (!output) return;

    // Support both block.config.output and block.output formats
    const config = block.config || block;

    // Format 1: Multi-output mapping { "field": "slot", ... }
    if (config.output && typeof config.output === 'object' && !Array.isArray(config.output)) {
      for (const [key, slot] of Object.entries(config.output)) {
        if (output[key] !== undefined) {
          this.dataBus.set(slot, output[key]);
        }
      }
      return;
    }

    // Format 2: Single slot name
    if (config.output) {
      this.dataBus.set(config.output, output);
      return;
    }

    // Format 3: Default - use block ID as slot
    this.dataBus.set(block.id, output);
  }

  /**
   * Deep resolve all ${...} variables in an object/array/string
   */
  deepResolve(value) {
    if (typeof value === 'string') {
      return this.resolveValue(value);
    }

    if (Array.isArray(value)) {
      return value.map(item => this.deepResolve(item));
    }

    if (value && typeof value === 'object') {
      const resolved = {};
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = this.deepResolve(val);
      }
      return resolved;
    }

    return value;
  }

  /**
   * Resolve a value (handles references like ${slot.path})
   */
  resolveValue(value) {
    if (typeof value !== 'string') return value;

    // Check for variable reference ${...}
    const match = value.match(/^\$\{([^}]+)\}$/);
    if (match) {
      const path = match[1];
      logger.debug(`    Resolving template: ${value}`);

      // Check context first (for env vars)
      if (path.startsWith('env.')) {
        const envValue = this.context.get(path.substring(4));
        logger.debug(`    → Resolved from env: ${envValue}`);
        return envValue;
      }

      // Check context directly (for BASE_URL, TIMEZONE, etc.)
      const contextValue = this.context.get(path);
      if (contextValue !== undefined) {
        logger.debug(`    → Resolved from context: ${contextValue}`);
        return contextValue;
      }

      // Check data bus
      const busValue = this.dataBus.get(path);
      logger.debug(`    → Resolved from data bus: ${busValue}`);
      return busValue;
    }

    // Check for template with multiple variables
    if (value.includes('${')) {
      return value.replace(/\$\{([^}]+)\}/g, (fullMatch, innerPath) => {
        if (innerPath.startsWith('env.')) {
          const v = this.context.get(innerPath.substring(4));
          return v !== undefined ? v : fullMatch;
        }
        // Check context first, then data bus
        const contextVal = this.context.get(innerPath);
        if (contextVal !== undefined) {
          return contextVal;
        }
        const v = this.dataBus.get(innerPath);
        return v !== undefined ? v : fullMatch;
      });
    }

    // If it's a plain string, check if it's a slot name
    const slotValue = this.dataBus.get(value);
    if (slotValue !== undefined) {
      return slotValue;
    }

    return value;
  }

  /**
   * Handle loop control flow
   */
  handleLoop(loopTo, currentIndex, maxLoops = LIMITS.MAX_LOOP_ITERATIONS) {
    const targetIndex = this.findBlockIndex(loopTo);
    if (targetIndex >= 0 && targetIndex < currentIndex) {
      logger.info(`↻ Looping back to block ${targetIndex + 1}`);

      // Check loop limit - use per-target counter
      const loopKey = `_loopCount:${loopTo}`;
      const loopCount = this.context.get(loopKey) || 0;
      if (loopCount >= maxLoops) {
        logger.warn('⚠ Loop limit reached');
        return null;
      }
      this.context.set(loopKey, loopCount + 1);
      return targetIndex - 1; // -1 because loop will increment
    }
    return null;
  }

  /**
   * Find block index by ID
   */
  findBlockIndex(blockId) {
    if (typeof blockId === 'number') return blockId;
    return this.blocks.findIndex(b => b.id === blockId);
  }

  /**
   * Check if pipeline had any errors
   */
  hasErrors() {
    return this.executionSummary ? this.executionSummary.hasErrors : false;
  }

  /**
   * Get execution summary
   */
  getSummary() {
    return this.executionSummary || {
      totalBlocks: this.blocks.length,
      executed: 0,
      succeeded: 0,
      failed: 0,
      totalDuration: 0
    };
  }
}
