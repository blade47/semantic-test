# Contributing to SemanticTest

## Development Setup

```bash
git clone https://github.com/blade47/semantic-test.git
cd semantic-test
npm install
npm test
```

## Creating Custom Blocks

### Block Anatomy

Every block must:
1. Extend the `Block` base class
2. Define static `inputs()` method
3. Define static `outputs()` method
4. Implement `process(inputs, context)` method

### Minimal Example

```javascript
import { Block } from '../../src/core/Block.js';

export class MyBlock extends Block {
  // Define what this block needs
  static get inputs() {
    return {
      required: ['data'],      // Block fails if missing
      optional: ['config']     // Block uses defaults if missing
    };
  }

  // Define what this block produces
  static get outputs() {
    return {
      produces: ['result', 'metadata']
    };
  }

  // Main processing logic
  async process(inputs, context) {
    const { data, config = {} } = inputs;

    // Do your work
    const result = transformData(data);

    // Return output
    return {
      result,
      metadata: { timestamp: Date.now() }
    };
  }
}
```

### Input Validation

The base `Block` class automatically validates required inputs. You can add custom validation:

```javascript
async process(inputs, context) {
  const { url, timeout = 5000 } = inputs;

  // Custom validation
  if (!url.startsWith('http')) {
    return {
      error: 'URL must start with http or https'
    };
  }

  // Process...
}
```

### Error Handling

Return an `error` field to signal failure:

```javascript
async process(inputs, context) {
  try {
    const result = await riskyOperation();
    return { result };
  } catch (error) {
    return {
      error: error.message,
      stack: error.stack
    };
  }
}
```

### Using Context

Context stores shared configuration:

```javascript
async process(inputs, context) {
  // Get values
  const apiKey = context.get('API_KEY');
  const timeout = context.get('timeout', 5000);  // with default

  // Set values (rarely needed in blocks)
  context.set('lastRequestTime', Date.now());

  // Check if exists
  if (context.has('database')) {
    const db = context.get('database');
  }
}
```

### Async Operations

All blocks can be async:

```javascript
async process(inputs, context) {
  // Network calls
  const response = await fetch(url);

  // Database queries
  const rows = await db.query(sql);

  // File operations
  const data = await fs.readFile(path);

  return { response, rows, data };
}
```

## Block Categories

Organize blocks by purpose:

- `blocks/http/` - HTTP and network operations
- `blocks/parse/` - Parsing and data transformation
- `blocks/validate/` - Validation and assertion
- `blocks/judge/` - AI evaluation
- `blocks/control/` - Flow control (loops, conditions)
- `blocks/test/` - Testing utilities
- `blocks/custom/` - Your custom blocks (not tracked)

## Advanced Patterns

### Multiple Output Modes

```javascript
async process(inputs, context) {
  const result = await doWork();

  // Users can choose what to output
  return {
    full: result,                    // Complete result
    summary: result.summary,          // Just summary
    error: result.error || null       // Just errors
  };
}
```

Usage in test:
```json
{
  "output": {
    "full": "fullData",
    "summary": "quickSummary"
  }
}
```

### Stateful Blocks

Use config to maintain state:

```javascript
export class Counter extends Block {
  constructor(config) {
    super(config);
    this.count = 0;  // Instance state
  }

  async process(inputs, context) {
    this.count++;
    return {
      count: this.count,
      timestamp: Date.now()
    };
  }
}
```

### Conditional Logic

```javascript
async process(inputs, context) {
  const { data, threshold = 100 } = inputs;

  if (data.value > threshold) {
    return {
      action: 'alert',
      message: `Value ${data.value} exceeds threshold`
    };
  } else {
    return {
      action: 'ignore',
      message: 'Within normal range'
    };
  }
}
```

### Block Composition

Blocks can use other blocks:

```javascript
import { HttpRequest } from '../http/HttpRequest.js';

export class AuthenticatedRequest extends Block {
  async process(inputs, context) {
    const { url, method, body } = inputs;

    // Get auth token
    const token = context.get('authToken');

    // Use HttpRequest block
    const httpBlock = new HttpRequest(this.config);
    const response = await httpBlock.process({
      url,
      method,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body
    }, context);

    return response;
  }
}
```

## Testing Blocks

Create unit tests in `tests/unit/blocks/`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MyBlock } from '../../../blocks/custom/MyBlock.js';
import { Context } from '../../../src/core/Context.js';

describe('MyBlock', () => {
  it('should process data correctly', async () => {
    const block = new MyBlock({ id: 'test' });
    const context = new Context();

    const result = await block.process(
      { data: 'input' },
      context
    );

    assert.strictEqual(result.result, 'processed-input');
  });

  it('should handle missing required inputs', async () => {
    const block = new MyBlock({ id: 'test' });
    const context = new Context();

    assert.throws(() => {
      block.validateInputs({});  // Missing 'data'
    }, /missing required inputs/);
  });

  it('should use optional parameters', async () => {
    const block = new MyBlock({ id: 'test' });
    const context = new Context();

    const result = await block.process(
      {
        data: 'input',
        config: { mode: 'fast' }
      },
      context
    );

    assert.ok(result.metadata.mode === 'fast');
  });
});
```

## Registering Blocks

### Option 1: Core Blocks (Framework Maintainers)

Edit `src/core/BlockRegistry.js`:

```javascript
import { MyBlock } from '../../blocks/category/MyBlock.js';

registerDefaults() {
  // ...
  this.register('MyBlock', MyBlock);
}
```

### Option 2: Custom Blocks (Users)

In your test setup file:

```javascript
import { blockRegistry } from 'semantic-test';
import { MyBlock } from './blocks/custom/MyBlock.js';

// Register before running tests
blockRegistry.register('MyBlock', MyBlock);
```

### Option 3: Plugin Pattern

Create a plugin file:

```javascript
// my-blocks-plugin.js
import { blockRegistry } from 'semantic-test';
import { BlockA } from './BlockA.js';
import { BlockB } from './BlockB.js';

export function registerMyBlocks() {
  blockRegistry.register('BlockA', BlockA);
  blockRegistry.register('BlockB', BlockB);
}
```

Use it:
```javascript
import { registerMyBlocks } from './my-blocks-plugin.js';
registerMyBlocks();
```

## Real-World Examples

### Database Query Block

```javascript
import { Block } from '../../src/core/Block.js';

export class DatabaseQuery extends Block {
  static get inputs() {
    return {
      required: ['query'],
      optional: ['params', 'timeout']
    };
  }

  static get outputs() {
    return {
      produces: ['rows', 'count', 'error']
    };
  }

  async process(inputs, context) {
    const { query, params = [], timeout = 5000 } = inputs;

    try {
      const db = context.get('database');
      if (!db) {
        return { error: 'Database not configured', rows: [], count: 0 };
      }

      const result = await db.query(query, params);

      return {
        rows: result.rows,
        count: result.rows.length
      };
    } catch (error) {
      return {
        error: error.message,
        rows: [],
        count: 0
      };
    }
  }
}
```

### File Upload Block

```javascript
import { Block } from '../../src/core/Block.js';
import FormData from 'form-data';
import fs from 'fs/promises';

export class FileUpload extends Block {
  static get inputs() {
    return {
      required: ['url', 'filePath'],
      optional: ['fieldName', 'headers']
    };
  }

  static get outputs() {
    return {
      produces: ['status', 'response', 'error']
    };
  }

  async process(inputs, context) {
    const { url, filePath, fieldName = 'file', headers = {} } = inputs;

    try {
      const form = new FormData();
      const fileContent = await fs.readFile(filePath);
      form.append(fieldName, fileContent, {
        filename: filePath.split('/').pop()
      });

      const response = await fetch(url, {
        method: 'POST',
        body: form,
        headers: {
          ...headers,
          ...form.getHeaders()
        }
      });

      const responseBody = await response.text();

      return {
        status: response.status,
        response: responseBody
      };
    } catch (error) {
      return {
        error: error.message,
        status: 0
      };
    }
  }
}
```

### Retry Block

```javascript
import { Block } from '../../src/core/Block.js';

export class Retry extends Block {
  static get inputs() {
    return {
      required: [],
      optional: ['*']  // Accept any inputs
    };
  }

  static get outputs() {
    return {
      produces: ['attempts', 'lastError']
    };
  }

  async process(inputs, context) {
    const { maxRetries = 3, delay = 1000 } = this.config;
    const attempts = context.get('_retryAttempts', 0);

    if (attempts >= maxRetries) {
      return {
        attempts,
        lastError: 'Max retries exceeded',
        _terminate: true  // Stop pipeline
      };
    }

    context.set('_retryAttempts', attempts + 1);

    // Wait before retry
    if (attempts > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return {
      attempts: attempts + 1,
      _loopTo: this.config.target  // Loop back
    };
  }
}
```

## Publishing Blocks

### As NPM Package

```javascript
// package.json
{
  "name": "semantic-test-database-blocks",
  "version": "1.0.0",
  "main": "index.js",
  "exports": {
    "./DatabaseQuery": "./blocks/DatabaseQuery.js",
    "./DatabaseInsert": "./blocks/DatabaseInsert.js"
  }
}

// index.js
export { DatabaseQuery } from './blocks/DatabaseQuery.js';
export { DatabaseInsert } from './blocks/DatabaseInsert.js';

export function register(blockRegistry) {
  blockRegistry.register('DatabaseQuery', DatabaseQuery);
  blockRegistry.register('DatabaseInsert', DatabaseInsert);
}
```

Usage:
```javascript
import { blockRegistry } from 'semantic-test';
import { register } from 'semantic-test-database-blocks';

register(blockRegistry);
```

## Best Practices

1. **Single Responsibility**: One block, one job
2. **Predictable Outputs**: Always return the same shape
3. **Error Objects**: Return `{ error: string }` for failures
4. **Async All The Way**: Make all `process()` methods async
5. **Document Inputs/Outputs**: Use JSDoc comments
6. **Test Thoroughly**: Unit test all edge cases
7. **Meaningful Names**: `ValidateEmail` not `Validator`
8. **Avoid Side Effects**: Don't modify context unless necessary

## Code Style

Follow the existing codebase:

```javascript
// Good
export class MyBlock extends Block {
  static get inputs() {
    return {
      required: ['data'],
      optional: ['config']
    };
  }

  async process(inputs, context) {
    const { data, config = {} } = inputs;
    // ...
  }
}

// Bad - inconsistent style
export class myBlock extends Block {
  static get inputs() { return { required: ["data"] }; }
  process(inputs, context) {  // Missing async
    var data = inputs.data;   // Use const/let
    // ...
  }
}
```

## Getting Help

- Check existing blocks in `blocks/` for patterns
- Read tests in `tests/unit/blocks/` for examples
- Open an issue for questions
- Submit PRs with new blocks!
