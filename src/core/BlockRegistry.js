// Import core blocks
import { HttpRequest } from '../../blocks/http/HttpRequest.js';
import { JsonParser } from '../../blocks/parse/JsonParser.js';
import { StreamParser } from '../../blocks/parse/StreamParser.js';
import { ValidateContent } from '../../blocks/validate/ValidateContent.js';
import { ValidateTools } from '../../blocks/validate/ValidateTools.js';
import { LLMJudge } from '../../blocks/judge/LLMJudge.js';
import { Loop } from '../../blocks/control/Loop.js';
import { MockData } from '../../blocks/test/MockData.js';

/**
 * Block Registry - Central registry of all available blocks
 */
class BlockRegistry {
  constructor() {
    this.blocks = new Map();
    this.registerDefaults();
  }

  /**
   * Register default blocks
   */
  registerDefaults() {
    // HTTP blocks
    this.register('HttpRequest', HttpRequest);

    // Parse blocks
    this.register('JsonParser', JsonParser);
    this.register('StreamParser', StreamParser);

    // Validate blocks
    this.register('ValidateContent', ValidateContent);
    this.register('ValidateTools', ValidateTools);

    // Judge blocks
    this.register('LLMJudge', LLMJudge);

    // Control flow blocks
    this.register('Loop', Loop);

    // Test utility blocks
    this.register('MockData', MockData);
  }

  /**
   * Register a block
   */
  register(name, BlockClass) {
    this.blocks.set(name, BlockClass);
  }

  /**
   * Get a block class
   */
  get(name) {
    return this.blocks.get(name);
  }

  /**
   * Check if block exists
   */
  has(name) {
    return this.blocks.has(name);
  }

  /**
   * Get all registered block names
   */
  list() {
    return Array.from(this.blocks.keys());
  }
}

// Export singleton instance
export const blockRegistry = new BlockRegistry();
// Also export the class for testing
export { BlockRegistry };
