/**
 * Mock utilities for testing
 */

/**
 * Create a mock fetch function
 */
export function createMockFetch(responses = []) {
  let callIndex = 0;

  return async (_url, _options) => {
    const response = responses[callIndex] || {
      status: 200,
      body: '',
      headers: {}
    };

    callIndex++;

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));

    return {
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      headers: new Map(Object.entries(response.headers || {})),
      text: () => Promise.resolve(response.body || ''),
      json: () => {
        if (typeof response.body === 'string') {
          return Promise.resolve(JSON.parse(response.body));
        }
        return Promise.resolve(response.body);
      }
    };
  };
}

/**
 * Create a mock OpenAI client
 */
export function createMockOpenAI(responses = []) {
  let callIndex = 0;

  return {
    chat: {
      completions: {
        create: async _params => {
          const response = responses[callIndex] || {
            choices: [{
              message: {
                content: JSON.stringify({
                  score: 0.8,
                  reasoning: 'Mock evaluation',
                  shouldContinue: false
                })
              }
            }]
          };

          callIndex++;

          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 10));

          return response;
        }
      }
    }
  };
}

/**
 * Create a mock block for testing
 */
export class MockBlock {
  constructor(config = {}) {
    this.config = config;
    this.id = config.id || 'mock-block';
    this.processCallCount = 0;
    this.lastInputs = null;
    this.lastContext = null;
  }

  static get inputs() {
    return {
      required: ['input1'],
      optional: ['input2']
    };
  }

  static get outputs() {
    return {
      produces: ['output1', 'output2']
    };
  }

  validateInputs(inputs) {
    const required = this.constructor.inputs.required || [];
    const missing = required.filter(req => !(req in inputs));

    if (missing.length > 0) {
      throw new Error(`Missing required inputs: ${missing.join(', ')}`);
    }
  }

  execute(inputs, context) {
    this.validateInputs(inputs);
    return this.process(inputs, context);
  }

  process(inputs, context) {
    this.processCallCount++;
    this.lastInputs = inputs;
    this.lastContext = context;

    if (this.config.throwError) {
      throw new Error(this.config.errorMessage || 'Mock error');
    }

    return this.config.output || {
      output1: `${inputs.input1}_processed`,
      output2: 'mock_output'
    };
  }
}

/**
 * Create test data for stream parsing
 */
export const testStreams = {
  vercelAI: {
    simple: 'data: {"type":"text-delta","textDelta":"Hello"}\ndata: {"type":"text-delta","textDelta":" world"}\ndata: {"type":"finish","finishReason":"stop"}',
    withTools: 'data: {"type":"text-delta","textDelta":"Checking calendar"}\ndata: {"type":"tool-call","toolCallId":"1","toolName":"getEvents","args":{"date":"2024-01-15"}}\ndata: {"type":"text-delta","textDelta":"Found 3 events"}\ndata: {"type":"finish","finishReason":"stop"}',
    malformed: 'data: not valid json\ndata: {"type":"text-delta","textDelta":"valid text"}\ndata: invalid'
  },
  openAI: {
    simple: 'data: {"choices":[{"delta":{"content":"Hello"}}]}\ndata: {"choices":[{"delta":{"content":" world"}}]}\ndata: [DONE]',
    withTools: 'data: {"choices":[{"delta":{"tool_calls":[{"id":"1","function":{"name":"getEvents","arguments":"{\\"date\\":\\"2024-01-15\\"}"}}]}}]}\ndata: [DONE]',
    malformed: 'data: not json\ndata: {"choices":[{"delta":{"content":"text"}}]}\ndata: [DONE]'
  }
};

/**
 * Create a test pipeline configuration
 */
export function createTestPipelineConfig(blocks = []) {
  return {
    name: 'Test Pipeline',
    version: '1.0.0',
    pipeline: blocks,
    context: {
      testMode: true
    }
  };
}

/**
 * Async delay helper
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assert helper for async errors
 */
export async function assertRejects(fn, errorMessage) {
  try {
    await fn();
    throw new Error(`Expected function to throw: ${errorMessage}`);
  } catch (error) {
    if (error.message === `Expected function to throw: ${errorMessage}`) {
      throw error;
    }
    // Expected error was thrown
    return error;
  }
}
