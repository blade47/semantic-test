import { Block } from '../../src/core/Block.js';
import { logger } from '../../src/utils/logger.js';

/**
 * StreamParser - Parses streaming responses using pluggable parsers
 *
 * Built-in parsers are auto-registered from the parsers/ directory.
 * Community can register custom parsers using StreamParser.register()
 */
export class StreamParser extends Block {
  // Parser registry - stores all available parsers
  static parsers = new Map();

  /**
   * Register a parser function for a specific format
   * @param {string} format - Format identifier (e.g., 'sse-openai', 'sse-vercel')
   * @param {Function} parser - Parser function (body: string) => { text, toolCalls, chunks, metadata }
   */
  static register(format, parser) {
    if (typeof parser !== 'function') {
      throw new Error(`Parser for format '${format}' must be a function`);
    }
    StreamParser.parsers.set(format, parser);
    logger.debug(`Registered parser for format: ${format}`);
  }

  /**
   * Get a registered parser
   * @param {string} format - Format identifier
   * @returns {Function|null} Parser function or null if not found
   */
  static getParser(format) {
    return StreamParser.parsers.get(format) || null;
  }

  /**
   * List all registered formats
   * @returns {string[]} Array of format names
   */
  static getFormats() {
    return Array.from(StreamParser.parsers.keys());
  }

  static get inputs() {
    return {
      required: ['body'],
      optional: ['format']
    };
  }

  static get outputs() {
    return {
      produces: ['text', 'toolCalls', 'chunks', 'metadata']
    };
  }

  process(inputs, _context) {
    const { body, format = 'text' } = inputs;

    // Get parser for the specified format
    const parser = StreamParser.parsers.get(format);

    if (!parser) {
      // No parser found - return as plain text
      logger.debug(`No parser found for format '${format}', returning as plain text`);
      return {
        text: body,
        toolCalls: [],
        chunks: [],
        metadata: { format: 'text', totalChunks: 0, totalTools: 0 }
      };
    }

    // Execute the parser
    try {
      const result = parser(body);

      // Ensure result has expected shape
      return {
        text: result.text || '',
        toolCalls: result.toolCalls || [],
        chunks: result.chunks || [],
        metadata: result.metadata || { format, totalChunks: 0, totalTools: 0 }
      };
    } catch (error) {
      logger.error(`Parser for format '${format}' threw error: ${error.message}`);
      return {
        text: '',
        toolCalls: [],
        chunks: [],
        metadata: { format, error: error.message }
      };
    }
  }
}

// Import and register built-in parsers
import { parseSSE } from './parsers/sse.js';
import { parseSSEOpenAI } from './parsers/sse-openai.js';
import { parseSSEVercel } from './parsers/sse-vercel.js';

// Register built-in parsers
StreamParser.register('sse', parseSSE);
StreamParser.register('sse-openai', parseSSEOpenAI);
StreamParser.register('sse-vercel', parseSSEVercel);

// Export for extension
export default StreamParser;
