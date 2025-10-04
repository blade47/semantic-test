import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { StreamParser } from '../../../blocks/parse/StreamParser.js';
import { testStreams } from '../../utils/mocks.js';

describe('StreamParser', () => {
  let parser;

  beforeEach(() => {
    parser = new StreamParser();
  });

  describe('input/output definitions', () => {
    test('should have correct inputs', () => {
      const { inputs } = StreamParser;
      assert.deepStrictEqual(inputs.required, ['body']);
      assert.deepStrictEqual(inputs.optional, ['format']);
    });

    test('should have correct outputs', () => {
      const { outputs } = StreamParser;
      assert.deepStrictEqual(outputs.produces, ['text', 'toolCalls', 'chunks', 'metadata']);
    });
  });

  describe('Vercel AI SDK format parsing', () => {
    test('should parse simple text stream', () => {
      const result = parser.process({ body: testStreams.vercelAI.simple, format: 'sse-vercel' });

      assert.strictEqual(result.text, 'Hello world');
      assert.deepStrictEqual(result.toolCalls, []);
      assert.strictEqual(result.chunks.length, 3);
      assert.strictEqual(result.metadata.format, 'sse-vercel');
      assert.strictEqual(result.metadata.totalChunks, 3);
      assert.strictEqual(result.metadata.totalTools, 0);
    });

    test('should parse stream with tool calls', () => {
      const result = parser.process({ body: testStreams.vercelAI.withTools, format: 'sse-vercel' });

      assert.strictEqual(result.text, 'Checking calendarFound 3 events');
      assert.strictEqual(result.toolCalls.length, 1);
      assert.strictEqual(result.toolCalls[0].name, 'getEvents');
      assert.deepStrictEqual(result.toolCalls[0].args, { date: '2024-01-15' });
      assert.strictEqual(result.metadata.totalTools, 1);
    });

    test('should handle malformed Vercel AI stream', () => {
      const result = parser.process({ body: testStreams.vercelAI.malformed, format: 'sse-vercel' });

      // Should still extract valid text
      assert.strictEqual(result.text, 'valid text');
      assert.strictEqual(result.chunks.length, 1);
    });

    test('should handle empty body', () => {
      const result = parser.process({ body: '', format: 'sse-vercel' });

      assert.strictEqual(result.text, '');
      assert.deepStrictEqual(result.toolCalls, []);
      assert.deepStrictEqual(result.chunks, []);
    });

    test('should parse multiple tool calls', () => {
      const multiToolStream = 'data: {"type":"text-delta","textDelta":"Analyzing"}\n' +
        'data: {"type":"tool-call","toolCallId":"1","toolName":"getEvents","args":{"date":"2024-01-15"}}\n' +
        'data: {"type":"tool-call","toolCallId":"2","toolName":"createEvent","args":{"title":"Meeting"}}\n' +
        'data: {"type":"text-delta","textDelta":"Done"}\n' +
        'data: {"type":"finish","finishReason":"stop"}';

      const result = parser.process({ body: multiToolStream, format: 'sse-vercel' });

      assert.strictEqual(result.text, 'AnalyzingDone');
      assert.strictEqual(result.toolCalls.length, 2);
      assert.strictEqual(result.toolCalls[0].name, 'getEvents');
      assert.strictEqual(result.toolCalls[1].name, 'createEvent');
    });

    test('should extract finish reason', () => {
      const result = parser.process({ body: testStreams.vercelAI.simple, format: 'sse-vercel' });

      const finishChunk = result.chunks.find(c => c.type === 'finish');
      assert.ok(finishChunk);
      assert.strictEqual(finishChunk.reason, 'stop');
    });
  });

  describe('OpenAI format parsing', () => {
    test('should parse simple OpenAI stream', () => {
      const result = parser.process({
        body: testStreams.openAI.simple,
        format: 'sse-openai'
      });

      assert.strictEqual(result.text, 'Hello world');
      assert.deepStrictEqual(result.toolCalls, []);
      assert.strictEqual(result.metadata.format, 'sse-openai');
    });

    test('should parse OpenAI stream with tool calls', () => {
      const result = parser.process({
        body: testStreams.openAI.withTools,
        format: 'sse-openai'
      });

      assert.strictEqual(result.toolCalls.length, 1);
      assert.strictEqual(result.toolCalls[0].name, 'getEvents');
      assert.deepStrictEqual(result.toolCalls[0].args, { date: '2024-01-15' });
    });

    test('should handle malformed OpenAI stream', () => {
      const result = parser.process({
        body: testStreams.openAI.malformed,
        format: 'sse-openai'
      });

      // Should still extract valid text
      assert.strictEqual(result.text, 'text');
    });

    test('should stop at [DONE] marker', () => {
      const streamWithExtra = `${testStreams.openAI.simple}\ndata: {"extra": "should not parse"}`;
      const result = parser.process({
        body: streamWithExtra,
        format: 'sse-openai'
      });

      assert.strictEqual(result.text, 'Hello world');
    });
  });

  describe('unknown format handling', () => {
    test('should return body as-is for unknown format', () => {
      const body = 'Some random text content';
      const result = parser.process({
        body,
        format: 'unknown'
      });

      assert.strictEqual(result.text, body);
      assert.deepStrictEqual(result.toolCalls, []);
      assert.deepStrictEqual(result.chunks, []);
      assert.strictEqual(result.metadata.format, 'text');
    });

    test('should default to text format when not specified', () => {
      const body = 'Plain text content';
      const result = parser.process({ body });
      assert.strictEqual(result.text, body);
      assert.strictEqual(result.metadata.format, 'text');
    });
  });

  describe('edge cases', () => {
    test('should handle stream with only newlines', () => {
      const result = parser.process({ body: '\n\n\n', format: 'sse-vercel' });

      assert.strictEqual(result.text, '');
      assert.deepStrictEqual(result.toolCalls, []);
    });

    test('should handle stream with mixed line endings', () => {
      const mixedStream = 'data: {"type":"text-delta","textDelta":"Hello"}\r\ndata: {"type":"text-delta","textDelta":" world"}\ndata: {"type":"text-delta","textDelta":"!"}\r\ndata: {"type":"finish","finishReason":"stop"}';
      const result = parser.process({ body: mixedStream, format: 'sse-vercel' });

      assert.strictEqual(result.text, 'Hello world!');
    });

    test('should handle very long text chunks', () => {
      const longText = 'x'.repeat(10000);
      const stream = `data: {"type":"text-delta","textDelta":"${longText}"}`;
      const result = parser.process({ body: stream, format: 'sse-vercel' });

      assert.strictEqual(result.text, longText);
    });

    test('should handle special characters in text', () => {
      const specialText = 'data: {"type":"text-delta","textDelta":"Hello \\n\\t\\"world\\""}\ndata: {"type":"text-delta","textDelta":" 🎉"}';
      const result = parser.process({ body: specialText, format: 'sse-vercel' });

      // JSON.parse correctly interprets escape sequences
      assert.strictEqual(result.text, 'Hello \n\t"world" 🎉');
    });

    test('should handle incomplete tool call data', () => {
      const incompleteStream = 'data: {"type":"text-delta","textDelta":"text"}\ndata: {"type":"tool-call","toolCallId":"1"}\ndata: {"type":"finish","finishReason":"stop"}';
      const result = parser.process({ body: incompleteStream, format: 'sse-vercel' });

      // Should still parse text but tool call might be incomplete
      assert.strictEqual(result.text, 'text');
      // Tool call parsing might fail but shouldn't crash
      assert.ok(Array.isArray(result.toolCalls));
    });
  });

  describe('chunk tracking', () => {
    test('should track text chunks correctly', () => {
      const result = parser.process({ body: testStreams.vercelAI.simple, format: 'sse-vercel' });

      const textChunks = result.chunks.filter(c => c.type === 'text');
      assert.strictEqual(textChunks.length, 2);
      assert.strictEqual(textChunks[0].content, 'Hello');
      assert.strictEqual(textChunks[1].content, ' world');
    });

    test('should preserve chunk order', () => {
      const stream = 'data: {"type":"text-delta","textDelta":"1"}\ndata: {"type":"text-delta","textDelta":"2"}\ndata: {"type":"text-delta","textDelta":"3"}\ndata: {"type":"text-delta","textDelta":"4"}\ndata: {"type":"text-delta","textDelta":"5"}';
      const result = parser.process({ body: stream, format: 'sse-vercel' });

      assert.strictEqual(result.text, '12345');
      assert.strictEqual(result.chunks.length, 5);
      result.chunks.forEach((chunk, i) => {
        assert.strictEqual(chunk.content, String(i + 1));
      });
    });
  });

  describe('metadata', () => {
    test('should include correct metadata for Vercel AI format', () => {
      const result = parser.process({ body: testStreams.vercelAI.withTools, format: 'sse-vercel' });

      assert.strictEqual(result.metadata.format, 'sse-vercel');
      assert.strictEqual(typeof result.metadata.totalChunks, 'number');
      assert.strictEqual(typeof result.metadata.totalTools, 'number');
      assert.ok(result.metadata.totalChunks > 0);
      assert.ok(result.metadata.totalTools > 0);
    });

    test('should include correct metadata for OpenAI format', () => {
      const result = parser.process({
        body: testStreams.openAI.simple,
        format: 'sse-openai'
      });

      assert.strictEqual(result.metadata.format, 'sse-openai');
      assert.strictEqual(typeof result.metadata.totalChunks, 'number');
      assert.strictEqual(typeof result.metadata.totalTools, 'number');
    });
  });

  describe('parser registry', () => {
    test('should have built-in parsers registered', () => {
      const formats = StreamParser.getFormats();
      assert.ok(formats.includes('sse'));
      assert.ok(formats.includes('sse-vercel'));
      assert.ok(formats.includes('sse-openai'));
    });

    test('should get registered parser', () => {
      const registeredParser = StreamParser.getParser('sse-vercel');
      assert.ok(registeredParser);
      assert.strictEqual(typeof registeredParser, 'function');
    });

    test('should register custom parser', () => {
      const customParser = body => ({
        text: `Custom: ${body}`,
        toolCalls: [],
        chunks: [],
        metadata: { format: 'custom' }
      });

      StreamParser.register('custom-test', customParser);

      const registered = StreamParser.getParser('custom-test');
      assert.strictEqual(registered, customParser);

      const result = parser.process({ body: 'test', format: 'custom-test' });
      assert.strictEqual(result.text, 'Custom: test');
    });

    test('should handle parser errors gracefully', () => {
      const errorParser = () => {
        throw new Error('Parser error');
      };

      StreamParser.register('error-test', errorParser);

      const result = parser.process({ body: 'test', format: 'error-test' });
      assert.strictEqual(result.text, '');
      assert.deepStrictEqual(result.toolCalls, []);
      assert.strictEqual(result.metadata.error, 'Parser error');
    });
  });
});
