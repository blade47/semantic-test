# SemanticTest Quick Start

Get up and running in 5 minutes.

## Install

```bash
npm install semantic-test
```

## Your First Test

Create `test.json`:

```json
{
  "name": "My First Test",
  "version": "1.0.0",
  "tests": [
    {
      "id": "test1",
      "name": "Fetch User",
      "pipeline": [
        {
          "id": "request",
          "block": "HttpRequest",
          "input": {
            "url": "https://jsonplaceholder.typicode.com/users/1",
            "method": "GET"
          },
          "output": "response"
        },
        {
          "id": "parse",
          "block": "JsonParser",
          "input": "${response.body}",
          "output": "user"
        }
      ],
      "assertions": {
        "response.status": 200,
        "user.parsed.id": 1
      }
    }
  ]
}
```

Run it:

```bash
npx semtest test.json
```

## Testing AI Chat

Create `ai-test.json`:

```json
{
  "name": "AI Chat Test",
  "context": {
    "API_URL": "${env.API_URL}",
    "API_KEY": "${env.API_KEY}"
  },
  "tests": [
    {
      "id": "chat-test",
      "name": "Test Chat Response",
      "pipeline": [
        {
          "id": "chat",
          "block": "HttpRequest",
          "input": {
            "url": "${API_URL}",
            "method": "POST",
            "headers": {
              "Authorization": "Bearer ${API_KEY}"
            },
            "body": {
              "messages": [
                {
                  "role": "user",
                  "content": "Hello, how are you?"
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
          "id": "validate",
          "block": "ValidateContent",
          "input": {
            "from": "parsed.text",
            "as": "text"
          },
          "config": {
            "minLength": 10,
            "contains": ["hello", "hi"]
          },
          "output": "validation"
        }
      ],
      "assertions": {
        "chatResponse.status": 200,
        "validation.passed": true
      }
    }
  ]
}
```

Create `.env`:

```bash
API_URL=https://your-api.com/chat
API_KEY=your-api-key
```

Run it:

```bash
npx semtest ai-test.json
```

## Validating AI Tool Usage

```json
{
  "pipeline": [
    {
      "id": "chat",
      "block": "HttpRequest",
      "input": {
        "url": "${API_URL}",
        "method": "POST",
        "body": {
          "messages": [
            {
              "role": "user",
              "content": "Search for users named John"
            }
          ]
        }
      },
      "output": "response"
    },
    {
      "id": "parse",
      "block": "StreamParser",
      "input": "${response.body}",
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
        "expected": ["search_users"],
        "forbidden": ["delete_users"]
      },
      "output": "toolValidation"
    }
  ],
  "assertions": {
    "response.status": 200,
    "toolValidation.passed": true,
    "parsed.toolCalls.length": 1
  }
}
```

## Using LLM Judge

Requires `OPENAI_API_KEY` in `.env`:

```json
{
  "pipeline": [
    {
      "id": "chat",
      "block": "HttpRequest",
      "input": { "..." },
      "output": "response"
    },
    {
      "id": "parse",
      "block": "StreamParser",
      "input": "${response.body}",
      "config": {
        "format": "sse-vercel"
      },
      "output": "parsed"
    },
    {
      "id": "judge",
      "block": "LLMJudge",
      "input": {
        "text": "${parsed.text}",
        "toolCalls": "${parsed.toolCalls}",
        "expected": {
          "expectedBehavior": "Should greet the user politely and offer assistance"
        }
      },
      "config": {
        "model": "gpt-4o-mini"
      },
      "output": "judgement"
    }
  ],
  "assertions": {
    "judgement.score": { "gt": 0.7 }
  }
}
```

## Setup and Teardown

```json
{
  "name": "Test Suite with Setup",
  "context": {
    "API_URL": "${env.API_URL}"
  },
  "setup": [
    {
      "id": "create-test-data",
      "block": "HttpRequest",
      "input": {
        "url": "${API_URL}/setup",
        "method": "POST",
        "body": { "data": "test" }
      },
      "output": "setupData"
    }
  ],
  "tests": [
    {
      "id": "test1",
      "name": "Use Test Data",
      "pipeline": [
        {
          "id": "use-data",
          "block": "HttpRequest",
          "input": {
            "url": "${API_URL}/test/${setupData.body.id}",
            "method": "GET"
          },
          "output": "result"
        }
      ],
      "assertions": {
        "result.status": 200
      }
    }
  ],
  "teardown": [
    {
      "id": "cleanup",
      "block": "HttpRequest",
      "input": {
        "url": "${API_URL}/cleanup/${setupData.body.id}",
        "method": "DELETE"
      }
    }
  ]
}
```

## Creating Custom Blocks

```javascript
// blocks/custom/MyBlock.js
import { Block } from 'semantic-test';

export class MyBlock extends Block {
  static get inputs() {
    return {
      required: ['data'],
      optional: []
    };
  }

  static get outputs() {
    return {
      produces: ['result']
    };
  }

  async process(inputs, context) {
    const { data } = inputs;

    // Your logic here
    const result = data.toUpperCase();

    return { result };
  }
}
```

Register it:

```javascript
// test-runner.js
import { blockRegistry } from 'semantic-test';
import { MyBlock } from './blocks/custom/MyBlock.js';
import { PipelineBuilder } from 'semantic-test';
import fs from 'fs/promises';

// Register custom block
blockRegistry.register('MyBlock', MyBlock);

// Run test
const testDef = JSON.parse(await fs.readFile('test.json', 'utf-8'));
const pipeline = PipelineBuilder.fromJSON(testDef);
const result = await pipeline.execute();

console.log(result.success ? 'PASS' : 'FAIL');
```

Use it in test:

```json
{
  "pipeline": [
    {
      "block": "MyBlock",
      "input": {
        "data": "hello"
      },
      "output": "myResult"
    }
  ],
  "assertions": {
    "myResult.result": "HELLO"
  }
}
```

## CLI Commands

```bash
# Run single test
npx semtest test.json

# Run all tests in directory
npx semtest tests/*.json

# Generate HTML report
npx semtest test.json --html

# Custom HTML output
npx semtest test.json --html --output report.html

# Debug mode (verbose logging)
LOG_LEVEL=DEBUG npx semtest test.json
```

## Next Steps

- Read the full [README](README.md) for all features
- Check [CONTRIBUTING.md](CONTRIBUTING.md) for block development
- See `examples/` for more complex scenarios
- Join discussions on GitHub

## Common Patterns

### Authentication Flow

```json
{
  "setup": [
    {
      "id": "login",
      "block": "HttpRequest",
      "input": {
        "url": "${API_URL}/auth/login",
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
      "pipeline": [
        {
          "id": "protected-request",
          "block": "HttpRequest",
          "input": {
            "url": "${API_URL}/protected",
            "method": "GET",
            "headers": {
              "Authorization": "Bearer ${auth.body.token}"
            }
          },
          "output": "protected"
        }
      ],
      "assertions": {
        "protected.status": 200
      }
    }
  ]
}
```

### Error Handling

```json
{
  "tests": [
    {
      "pipeline": [
        {
          "id": "bad-request",
          "block": "HttpRequest",
          "input": {
            "url": "${API_URL}/invalid",
            "method": "GET"
          },
          "output": "response"
        }
      ],
      "assertions": {
        "response.status": 404
      }
    }
  ]
}
```

### Multi-Step Flow

```json
{
  "pipeline": [
    {
      "id": "create",
      "block": "HttpRequest",
      "input": {
        "url": "${API_URL}/users",
        "method": "POST",
        "body": { "name": "John" }
      },
      "output": "createResponse"
    },
    {
      "id": "fetch",
      "block": "HttpRequest",
      "input": {
        "url": "${API_URL}/users/${createResponse.body.id}",
        "method": "GET"
      },
      "output": "fetchResponse"
    },
    {
      "id": "update",
      "block": "HttpRequest",
      "input": {
        "url": "${API_URL}/users/${createResponse.body.id}",
        "method": "PUT",
        "body": { "name": "Jane" }
      },
      "output": "updateResponse"
    }
  ],
  "assertions": {
    "createResponse.status": 201,
    "fetchResponse.status": 200,
    "updateResponse.status": 200,
    "updateResponse.body.name": "Jane"
  }
}
```

## Tips

1. **Start simple** - Test basic requests before complex flows
2. **Use meaningful names** - Clear block IDs make debugging easier
3. **Validate early** - Cheap validations before expensive ones
4. **Environment variables** - Use `.env` for secrets and config
5. **Debug mode** - Use `LOG_LEVEL=DEBUG` to see everything
6. **HTML reports** - Great for CI/CD and sharing results

## Need Help?

- GitHub Issues: https://github.com/blade47/semantic-test/issues
- Examples: See `test-examples/` directory
- Full docs: [README.md](README.md)
