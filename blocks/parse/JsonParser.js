import { Block } from '../../src/core/Block.js';

/**
 * JsonParser - Parses JSON strings
 */
export class JsonParser extends Block {
  static get inputs() {
    return {
      required: ['body'],
      optional: []
    };
  }

  static get outputs() {
    return {
      produces: ['parsed', 'error', 'raw']
    };
  }

  process(inputs, _context) {
    const { body } = inputs;

    try {
      const parsed = JSON.parse(body);
      return { parsed };
    } catch (error) {
      return {
        error: `JSON parse error: ${error.message}`,
        raw: body
      };
    }
  }
}
