<p align="center">
  <img src="assets/logo.png" alt="SemanticTest" width="300">
</p>

<h1 align="center">SemanticTest</h1>

<p align="center">
  A composable, pipeline-based testing framework for AI systems and APIs.<br>
  Build complex test scenarios using simple, reusable blocks with semantic validation.
</p>

```bash
npm install @blade47/semantic-test
```

## Why SemanticTest?

Testing AI systems is hard. Responses are non-deterministic, you need to validate tool usage, and semantic meaning matters more than exact text matching.

SemanticTest solves this with:
- **Composable blocks** for HTTP, parsing, validation, and AI evaluation
- **Pipeline architecture** where data flows through named slots
- **LLM Judge** to evaluate responses semantically using GPT-4
- **JSON test definitions** that are readable and version-controllable

## Quick Start

### 1. Install

```bash
npm install @blade47/semantic-test
```

### 2. Create a test

```json
{
  "name": "API Test",
  "version": "1.0.0",
  "context": {
    "BASE_URL": "https://api.example.com"
  },
  "tests": [
    {
      "id": "get-user",
      "name": "Get User",
      "pipeline": [
        {
          "id": "request",
          "block": "HttpRequest",
          "input": {
            "url": "${BASE_URL}/users/1",
            "method": "GET"
          },
          "output": "response"
        },
        {
          "id": "parse",
          "block": "JsonParser",
          "input": "${response.body}",
          "output": "user"
        },
        {
          "id": "validate",
          "block": "ValidateContent",
          "input": {
            "from": "user.parsed.name",
            "as": "text"
          },
          "config": {
            "contains": "John"
          },
          "output": "validation"
        }
      ],
      "assertions": {
        "response.status": 200,
        "user.parsed.id": 1,
        "validation.passed": true
      }
    }
  ]
}
```

### 3. Run it

```bash
npx semtest test.json
```

## Core Concepts

### Pipelines

Tests are pipelines of blocks that execute in sequence:

```
HttpRequest → JsonParser → Validate → Assert
```

Each block:
- Reads inputs from named slots
- Does one thing well
- Writes outputs to named slots

### Data Flow

Data flows through a **DataBus** with named slots:

```json
{
  "pipeline": [
    {
      "id": "fetch",
      "block": "HttpRequest",
      "output": "response"        // Writes to 'response' slot
    },
    {
      "id": "parse",
      "block": "JsonParser",
      "input": "${response.body}",  // Reads from 'response.body'
      "output": "data"              // Writes to 'data' slot
    }
  ]
}
```

### Three Input Formats

**1. String** - becomes `{ body: value }`
```json
"input": "${response.body}"
```

**2. From/As** - maps slot to parameter
```json
"input": {
  "from": "response.body",
  "as": "text"
}
```

**3. Object** - deep resolves all values
```json
"input": {
  "url": "${BASE_URL}/api",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer ${token}"
  }
}
```

### Three Output Formats

**1. String** - stores entire output
```json
"output": "myResult"
```

**2. Object** - maps output fields to slots
```json
"output": {
  "parsed": "data",
  "error": "parseError"
}
```

**3. Default** - uses block ID
```json
{
  "id": "parse"
  // Output stored in 'parse' slot
}
```

## Available Blocks

### HTTP

**HttpRequest** - Make HTTP requests
```json
{
  "block": "HttpRequest",
  "input": {
    "url": "https://api.example.com/users",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer ${token}"
    },
    "body": {
      "name": "John Doe"
    },
    "timeout": 5000
  }
}
```

### Parsers

**JsonParser** - Parse JSON
```json
{
  "block": "JsonParser",
  "input": "${response.body}"
}
```

**StreamParser** - Parse streaming responses
```json
{
  "block": "StreamParser",
  "input": "${response.body}",
  "config": {
    "format": "sse-vercel"  // or "sse-openai", "sse"
  }
}
```

Outputs: `text`, `toolCalls`, `chunks`, `metadata`

### Validators

**ValidateContent** - Validate text
```json
{
  "block": "ValidateContent",
  "input": {
    "from": "data.message",
    "as": "text"
  },
  "config": {
    "contains": ["success", "confirmed"],
    "notContains": ["error", "failed"],
    "minLength": 10,
    "maxLength": 1000,
    "matches": "^[A-Z].*"
  }
}
```

**ValidateTools** - Validate AI tool usage
```json
{
  "block": "ValidateTools",
  "input": {
    "from": "parsed.toolCalls",
    "as": "toolCalls"
  },
  "config": {
    "expected": ["search_database", "send_email"],
    "forbidden": ["delete_all"],
    "order": ["search_database", "send_email"],
    "minTools": 1,
    "maxTools": 5,
    "validateArgs": {
      "send_email": {
        "to": "user@example.com"
      }
    }
  }
}
```

### AI Judge

**LLMJudge** - Semantic evaluation with GPT-4
```json
{
  "block": "LLMJudge",
  "input": {
    "text": "${response.text}",
    "toolCalls": "${response.toolCalls}",
    "expected": {
      "expectedBehavior": "Should greet the user and offer to help with their calendar"
    }
  },
  "config": {
    "model": "gpt-4o-mini",
    "criteria": {
      "accuracy": 0.4,
      "completeness": 0.3,
      "relevance": 0.3
    }
  }
}
```

Returns: `score` (0-1), `reasoning`, `shouldContinue`, `nextPrompt`

### Control Flow

**Loop** - Loop back to previous blocks
```json
{
  "block": "Loop",
  "config": {
    "target": "retry-request",
    "maxIterations": 3
  }
}
```

## Test Suites

Organize multiple tests with shared setup/teardown:

```json
{
  "name": "User API Tests",
  "version": "1.0.0",
  "context": {
    "BASE_URL": "${env.API_URL}",
    "API_KEY": "${env.API_KEY}"
  },
  "setup": [
    {
      "id": "auth",
      "block": "HttpRequest",
      "input": {
        "url": "${BASE_URL}/auth/login",
        "method": "POST",
        "body": {
          "username": "test",
          "password": "test123"
        }
      },
      "output": "auth"
    }
  ],
  "tests": [
    {
      "id": "create-user",
      "name": "Create User",
      "pipeline": [
        {
          "id": "request",
          "block": "HttpRequest",
          "input": {
            "url": "${BASE_URL}/users",
            "method": "POST",
            "headers": {
              "Authorization": "Bearer ${auth.body.token}"
            },
            "body": {
              "name": "Jane Doe"
            }
          },
          "output": "createResponse"
        }
      ],
      "assertions": {
        "createResponse.status": 201
      }
    },
    {
      "id": "get-user",
      "name": "Get User",
      "pipeline": [
        {
          "id": "request",
          "block": "HttpRequest",
          "input": {
            "url": "${BASE_URL}/users/${createResponse.body.id}",
            "method": "GET",
            "headers": {
              "Authorization": "Bearer ${auth.body.token}"
            }
          },
          "output": "getResponse"
        }
      ],
      "assertions": {
        "getResponse.status": 200,
        "getResponse.body.name": "Jane Doe"
      }
    }
  ],
  "teardown": [
    {
      "id": "cleanup",
      "block": "HttpRequest",
      "input": {
        "url": "${BASE_URL}/users/${createResponse.body.id}",
        "method": "DELETE",
        "headers": {
          "Authorization": "Bearer ${auth.body.token}"
        }
      }
    }
  ]
}
```

## Assertions

Validate final results with operators:

```json
{
  "assertions": {
    "response.status": 200,                    // Equality
    "data.count": { "gt": 10 },               // Greater than
    "data.count": { "lt": 100 },              // Less than
    "data.message": { "contains": "success" }, // Contains
    "data.email": { "matches": ".*@.*\\.com" } // Regex
  }
}
```

## Environment Variables

Use `.env` file:

```bash
API_URL=https://api.example.com
API_KEY=secret123
OPENAI_API_KEY=sk-...
```

Reference in tests:

```json
{
  "context": {
    "BASE_URL": "${env.API_URL}",
    "API_KEY": "${env.API_KEY}"
  }
}
```

## Testing AI Systems

### Example: Chat API

```json
{
  "name": "AI Chat Tests",
  "context": {
    "CHAT_URL": "${env.CHAT_API_URL}",
    "API_KEY": "${env.API_KEY}"
  },
  "tests": [
    {
      "id": "chat-test",
      "name": "Chat with Tool Usage",
      "pipeline": [
        {
          "id": "chat",
          "block": "HttpRequest",
          "input": {
            "url": "${CHAT_URL}",
            "method": "POST",
            "headers": {
              "Authorization": "Bearer ${API_KEY}"
            },
            "body": {
              "messages": [
                {
                  "role": "user",
                  "content": "Search for users named John"
                }
              ]
            }
          },
          "output": "chatResponse"
        },
        {
          "id": "parse",
          "block": "StreamParser",
          "input": "${chatResponse.body}",
          "config": {
            "format": "sse-vercel"
          },
          "output": "parsed"
        },
        {
          "id": "validate-tools",
          "block": "ValidateTools",
          "input": {
            "from": "parsed.toolCalls",
            "as": "toolCalls"
          },
          "config": {
            "expected": ["search_users"]
          },
          "output": "toolValidation"
        },
        {
          "id": "judge",
          "block": "LLMJudge",
          "input": {
            "text": "${parsed.text}",
            "toolCalls": "${parsed.toolCalls}",
            "expected": {
              "expectedBehavior": "Should use search_users tool and confirm searching for John"
            }
          },
          "config": {
            "model": "gpt-4o-mini"
          },
          "output": "judgement"
        }
      ],
      "assertions": {
        "chatResponse.status": 200,
        "toolValidation.passed": true,
        "judgement.score": { "gt": 0.7 }
      }
    }
  ]
}
```

### Why LLM Judge?

AI outputs vary. Exact text matching fails. Instead, use another LLM to evaluate **semantic meaning**:

- "2:00 PM", "2 PM", "14:00" are all acceptable
- Focuses on intent and helpfulness
- Provides reasoning for failures
- Configurable scoring criteria

## Custom Blocks

### Create a Block

```javascript
// blocks/custom/MyBlock.js
import { Block } from '@blade47/semantic-test';

export class MyBlock extends Block {
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

    // Your logic
    const result = await processData(data, config);

    return {
      result,
      metadata: { timestamp: Date.now() }
    };
  }
}
```

### Register It

```javascript
import { blockRegistry } from '@blade47/semantic-test';
import { MyBlock } from './blocks/custom/MyBlock.js';

blockRegistry.register('MyBlock', MyBlock);
```

### Use It

```json
{
  "block": "MyBlock",
  "input": {
    "data": "${previous.output}",
    "config": { "mode": "fast" }
  },
  "output": "myResult"
}
```

See `blocks/examples/` for complete examples.

## CLI

```bash
# Run single test
npx semtest test.json

# Run multiple tests
npx semtest tests/*.json

# Generate HTML report
npx semtest test.json --html

# Custom output file
npx semtest test.json --html --output report.html

# Debug mode
LOG_LEVEL=DEBUG npx semtest test.json
```

## Programmatic Usage

```javascript
import { PipelineBuilder } from '@blade47/semantic-test';
import fs from 'fs/promises';

const testDef = JSON.parse(await fs.readFile('test.json', 'utf-8'));
const pipeline = PipelineBuilder.fromJSON(testDef);

const result = await pipeline.execute();

if (result.success) {
  console.log('Test passed!');
} else {
  console.error('Test failed:', result.error);
}
```

## Examples

See `examples/` directory:

- `simple-api-test.json` - Basic REST API testing
- `test-llm-judge.json` - AI response evaluation
- `test-error-reporting.json` - Error handling
- `test-reporting.json` - Rich output formatting

## Advanced Features

### Multi-turn Conversations

```json
{
  "block": "LLMJudge",
  "input": {
    "text": "${response.text}",
    "history": [
      { "role": "user", "content": "Hello" },
      { "role": "assistant", "content": "Hi there!" },
      { "role": "user", "content": "What's the weather?" }
    ]
  },
  "config": {
    "continueConversation": true,
    "maxTurns": 5
  }
}
```

### Custom Stream Parsers

```javascript
import { StreamParser } from '@blade47/semantic-test';

function myCustomParser(body) {
  // Parse your custom format
  return {
    text: extractedText,
    toolCalls: extractedTools,
    chunks: allChunks,
    metadata: { format: 'custom' }
  };
}

StreamParser.register('my-format', myCustomParser);
```

Use it:
```json
{
  "block": "StreamParser",
  "config": {
    "format": "my-format"
  }
}
```

### Loop Control

```json
{
  "pipeline": [
    {
      "id": "attempt",
      "block": "HttpRequest",
      "input": { "url": "${API_URL}" }
    },
    {
      "id": "check",
      "block": "ValidateContent",
      "input": { "from": "attempt.body", "as": "text" },
      "config": { "contains": "success" }
    },
    {
      "id": "retry",
      "block": "Loop",
      "config": {
        "target": "attempt",
        "maxIterations": 3
      }
    }
  ]
}
```

## Best Practices

### 1. Use Meaningful Slot Names

```json
// Good
"output": "userProfile"
"output": "authToken"

// Bad
"output": "data"
"output": "result"
```

### 2. Validate Early

```json
{
  "pipeline": [
    { "block": "HttpRequest", "output": "response" },
    { "block": "JsonParser", "output": "data" },
    { "block": "ValidateContent" },  // Validate before expensive operations
    { "block": "LLMJudge" }          // Expensive: calls GPT-4
  ]
}
```

### 3. Use Setup/Teardown

Always clean up test data:

```json
{
  "setup": [
    { "id": "create-test-data", "block": "..." }
  ],
  "tests": [ /* ... */ ],
  "teardown": [
    { "id": "delete-test-data", "block": "..." }
  ]
}
```

### 4. Semantic Validation for AI

Don't match exact text:

```json
// Bad - too brittle
{
  "assertions": {
    "response.text": "The meeting is scheduled for 2:00 PM"
  }
}

// Good - semantic validation
{
  "block": "LLMJudge",
  "input": {
    "expected": {
      "expectedBehavior": "Should confirm meeting is scheduled for 2 PM"
    }
  }
}
```

## Contributing

```bash
git clone https://github.com/blade47/semantic-test.git
cd semantic-test
npm install
npm test
```

### Adding Blocks

1. Create block in `blocks/[category]/YourBlock.js`
2. Add tests in `tests/unit/blocks/YourBlock.test.js`
3. Register in `src/core/BlockRegistry.js`
4. Document in README

### Testing

```bash
npm test              # All tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests
npm run test:watch    # Watch mode
```

## License

MIT

## Support

- GitHub Issues: https://github.com/blade47/semantic-test/issues
- Documentation: https://github.com/blade47/semantic-test/wiki

---

**Built for testing AI systems that don't play by traditional rules.**
