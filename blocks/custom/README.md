# Custom Blocks

This directory is for your custom blocks. Add your own blocks here and they won't be tracked by git.

## Quick Start

1. **Create a new block file** (e.g., `MyCustomBlock.js`)
2. **Extend the Block class**
3. **Register it in your test setup**

## Example

```javascript
// blocks/custom/MyCustomBlock.js
import { Block } from '../../src/core/Block.js';

export class MyCustomBlock extends Block {
  static get inputs() {
    return {
      required: ['data'],
      optional: ['config']
    };
  }

  static get outputs() {
    return {
      produces: ['result', 'metadata']
    };
  }

  async process(inputs, context) {
    const { data, config } = inputs;

    // Your logic here
    const result = await doSomething(data);

    return {
      result,
      metadata: { processed: true }
    };
  }
}
```

## Register Your Block

```javascript
// In your test setup file
import { blockRegistry } from 'semantic-test';
import { MyCustomBlock } from './blocks/custom/MyCustomBlock.js';

blockRegistry.register('MyCustomBlock', MyCustomBlock);
```

## Use in Tests

```json
{
  "pipeline": [
    {
      "id": "my-step",
      "block": "MyCustomBlock",
      "input": {
        "data": "${previous.output}"
      },
      "config": {
        "someOption": true
      },
      "output": "myResult"
    }
  ]
}
```

## See Example

Check `blocks/custom/examples/` for complete working examples.
