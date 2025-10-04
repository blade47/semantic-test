/**
 * Base Block class - the fundamental unit of the pipeline
 * Each block is a composable, reusable transformation
 */
export class Block {
  constructor(config = {}) {
    this.config = config;
    this.id = config.id || this.constructor.name;
  }

  /**
   * Define input requirements
   * @returns {Object} Input schema
   */
  static get inputs() {
    return {
      required: [],
      optional: []
    };
  }

  /**
   * Define output specification
   * @returns {Object} Output schema
   */
  static get outputs() {
    return {
      produces: []
    };
  }

  /**
   * Validate that required inputs are present
   * @param {any} inputs - Input data to validate
   * @throws {Error} If required inputs are missing
   */
  validateInputs(inputs) {
    const required = this.constructor.inputs.required || [];
    const missing = required.filter(req => {
      if (typeof inputs === 'object' && inputs !== null) {
        return !(req in inputs) || inputs[req] === undefined;
      }
      return true;
    });

    if (missing.length > 0) {
      throw new Error(
        `Block '${this.id}' missing required inputs: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Main execution method - validates inputs and calls process
   * @param {any} inputs - Input data (can be single value or object with multiple inputs)
   * @param {Context} context - Shared context
   * @returns {Promise<any>} Output data from process method
   * @throws {Error} If validation fails or process throws
   */
  execute(inputs, context) {
    this.validateInputs(inputs);
    return this.process(inputs, context);
  }

  /**
   * Process implementation - override in subclasses
   * @param {any} _inputs - Input data validated by execute
   * @param {Context} _context - Shared context
   * @returns {Promise<any>} Output data
   * @throws {Error} Must be implemented by subclasses
   */
  process(_inputs, _context) {
    throw new Error(`Block '${this.id}' must implement process method`);
  }
}
