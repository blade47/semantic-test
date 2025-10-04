import { Pipeline } from './Pipeline.js';
import { blockRegistry } from './BlockRegistry.js';

/**
 * PipelineBuilder - Builds pipelines from JSON definitions
 */
export class PipelineBuilder {
  constructor() {
    this.blocks = [];
  }

  /**
   * Build pipeline from JSON definition
   */
  static fromJSON(definition) {
    const builder = new PipelineBuilder();

    // Parse if string
    const config = typeof definition === 'string' ?
      JSON.parse(definition) :
      definition;

    // Add each block
    for (const blockDef of config.pipeline || []) {
      builder.addBlock(blockDef);
    }

    // Create pipeline and set context
    const pipeline = builder.build();

    // Set initial context from definition
    if (config.context) {
      for (const [key, value] of Object.entries(config.context)) {
        // Resolve environment variables in context values
        let resolvedValue = value;
        if (typeof value === 'string' && value.includes('${env.')) {
          resolvedValue = value.replace(/\$\{env\.([^}]+)\}/g, (match, envVar) => {
            const envValue = process.env[envVar];
            return envValue || match;
          });
        }
        pipeline.context.set(key, resolvedValue);
      }
    }

    // Store test metadata
    pipeline.context.set('_test', {
      name: config.name,
      version: config.version,
      input: config.input,
      output: config.output,
      assertions: config.assertions
    });

    return pipeline;
  }

  /**
   * Add a block to the pipeline
   */
  addBlock(blockDef) {
    // Get block class from registry
    const BlockClass = blockRegistry.get(blockDef.block);

    if (!BlockClass) {
      throw new Error(`Unknown block type: ${blockDef.block}`);
    }

    // Create block instance with config
    const block = new BlockClass({
      ...blockDef,
      id: blockDef.id || blockDef.block
    });

    this.blocks.push(block);
    return this;
  }

  /**
   * Build the pipeline
   */
  build() {
    return new Pipeline(this.blocks);
  }
}
