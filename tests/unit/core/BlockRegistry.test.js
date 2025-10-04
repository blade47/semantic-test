import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { BlockRegistry } from '../../../src/core/BlockRegistry.js';
import { Block } from '../../../src/core/Block.js';

// Create test block classes
class TestBlock extends Block {
  process(_inputs) {
    return { result: 'test' };
  }
}

class AnotherBlock extends Block {
  process(_inputs) {
    return { result: 'another' };
  }
}

describe('BlockRegistry', () => {
  let registry;

  beforeEach(() => {
    // Create new registry for each test to avoid interference
    registry = new BlockRegistry();
  });

  describe('registration', () => {
    test('should register a block', () => {
      registry.register('TestBlock', TestBlock);

      assert.ok(registry.has('TestBlock'));
      assert.strictEqual(registry.get('TestBlock'), TestBlock);
    });

    test('should register multiple blocks', () => {
      const startSize = registry.blocks.size;
      registry.register('TestBlock', TestBlock);
      registry.register('AnotherBlock', AnotherBlock);

      assert.ok(registry.has('TestBlock'));
      assert.ok(registry.has('AnotherBlock'));
      assert.strictEqual(registry.blocks.size, startSize + 2);
    });

    test('should overwrite existing registration', () => {
      const startSize = registry.blocks.size;
      registry.register('MyBlock', TestBlock);
      registry.register('MyBlock', AnotherBlock);

      assert.strictEqual(registry.get('MyBlock'), AnotherBlock);
      assert.strictEqual(registry.blocks.size, startSize + 1);
    });
  });

  describe('retrieval', () => {
    test('should get registered block', () => {
      registry.register('TestBlock', TestBlock);

      const BlockClass = registry.get('TestBlock');
      assert.strictEqual(BlockClass, TestBlock);

      // Verify we can instantiate it
      const instance = new BlockClass();
      assert.ok(instance instanceof TestBlock);
    });

    test('should return undefined for unknown block', () => {
      const BlockClass = registry.get('UnknownBlock');
      assert.strictEqual(BlockClass, undefined);
    });

    test('should check if block exists', () => {
      registry.register('TestBlock', TestBlock);

      assert.strictEqual(registry.has('TestBlock'), true);
      assert.strictEqual(registry.has('UnknownBlock'), false);
    });
  });

  describe('listing', () => {
    test('should list all registered block names', () => {
      const startSize = registry.list().length;
      registry.register('Block1', TestBlock);
      registry.register('Block2', AnotherBlock);
      registry.register('Block3', TestBlock);

      const list = registry.list();

      assert.ok(Array.isArray(list));
      assert.strictEqual(list.length, startSize + 3);
      assert.ok(list.includes('Block1'));
      assert.ok(list.includes('Block2'));
      assert.ok(list.includes('Block3'));
    });

    test('should return empty array when no blocks registered', () => {
      const emptyRegistry = new BlockRegistry();
      // Don't call registerDefaults()
      emptyRegistry.blocks.clear();

      const list = emptyRegistry.list();

      assert.ok(Array.isArray(list));
      assert.strictEqual(list.length, 0);
    });
  });

  describe('default blocks', () => {
    test('should have default blocks registered', async () => {
      // Use the singleton instance with defaults
      const { blockRegistry } = await import('../../../src/core/BlockRegistry.js');

      assert.ok(blockRegistry.has('HttpRequest'));
      assert.ok(blockRegistry.has('JsonParser'));
      assert.ok(blockRegistry.has('StreamParser'));
      assert.ok(blockRegistry.has('ValidateContent'));
      assert.ok(blockRegistry.has('ValidateTools'));
      assert.ok(blockRegistry.has('LLMJudge'));
      assert.ok(blockRegistry.has('Loop'));
    });

    test('should list all default blocks', async () => {
      const { blockRegistry } = await import('../../../src/core/BlockRegistry.js');
      const list = blockRegistry.list();

      const expectedBlocks = [
        'HttpRequest',
        'JsonParser',
        'StreamParser',
        'ValidateContent',
        'ValidateTools',
        'LLMJudge',
        'Loop'
      ];

      for (const blockName of expectedBlocks) {
        assert.ok(list.includes(blockName), `Missing default block: ${blockName}`);
      }
    });

    test('should instantiate default blocks', async () => {
      const { blockRegistry } = await import('../../../src/core/BlockRegistry.js');

      // Test instantiation of a few default blocks
      const JsonParserClass = blockRegistry.get('JsonParser');
      const jsonParser = new JsonParserClass({ id: 'test-parser' });
      assert.ok(jsonParser);
      assert.strictEqual(jsonParser.id, 'test-parser');

      const LoopClass = blockRegistry.get('Loop');
      const loop = new LoopClass({ target: 'test' });
      assert.ok(loop);
      assert.strictEqual(loop.config.target, 'test');
    });
  });

  describe('singleton pattern', () => {
    test('should export singleton instance', async () => {
      // Import multiple times
      const { blockRegistry: registry1 } = await import('../../../src/core/BlockRegistry.js');
      const { blockRegistry: registry2 } = await import('../../../src/core/BlockRegistry.js');

      // Should be the same instance
      assert.strictEqual(registry1, registry2);

      // Modifications should be reflected in both
      registry1.register('SingletonTest', TestBlock);
      assert.ok(registry2.has('SingletonTest'));
    });
  });

  describe('edge cases', () => {
    test('should handle null block class', () => {
      registry.register('NullBlock', null);

      assert.ok(registry.has('NullBlock'));
      assert.strictEqual(registry.get('NullBlock'), null);
    });

    test('should handle undefined block class', () => {
      registry.register('UndefinedBlock', undefined);

      assert.ok(registry.has('UndefinedBlock'));
      assert.strictEqual(registry.get('UndefinedBlock'), undefined);
    });

    test('should handle empty string as block name', () => {
      registry.register('', TestBlock);

      assert.ok(registry.has(''));
      assert.strictEqual(registry.get(''), TestBlock);
    });

    test('should be case-sensitive', () => {
      registry.register('TestBlock', TestBlock);
      registry.register('testblock', AnotherBlock);

      assert.strictEqual(registry.get('TestBlock'), TestBlock);
      assert.strictEqual(registry.get('testblock'), AnotherBlock);
      assert.strictEqual(registry.get('TESTBLOCK'), undefined);
    });
  });
});
