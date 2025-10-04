import { logger } from '../../../src/utils/logger.js';

/**
 * Parse Vercel AI SDK SSE stream format
 * @param {string} body - Raw SSE stream body
 * @returns {Object} Parsed result with text, toolCalls, chunks, and metadata
 */
export function parseSSEVercel(body) {
  const lines = body.split(/\r?\n/);
  const chunks = [];
  const toolCalls = [];
  const toolCallMap = new Map(); // Track tool calls by ID
  const toolErrors = []; // Track tool execution errors
  let text = '';

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;

    const data = line.substring(6);
    if (data === '[DONE]') break;

    try {
      const event = JSON.parse(data);

      switch (event.type) {
        case 'text-delta':
          text += event.delta || event.textDelta || '';
          chunks.push({ type: 'text', content: event.delta || event.textDelta });
          break;

        case 'tool-call':
          // Complete tool call with name and arguments
          if (event.toolCallId && event.toolName) {
            const toolCall = {
              id: event.toolCallId,
              name: event.toolName,
              args: event.args || {}
            };
            toolCalls.push(toolCall);
            toolCallMap.set(event.toolCallId, toolCall);
          }
          break;

        case 'tool-input-start':
          // Start of a tool call
          if (!toolCallMap.has(event.toolCallId)) {
            const toolCall = {
              id: event.toolCallId,
              name: event.toolName,
              args: {},
              inputText: ''
            };
            toolCalls.push(toolCall);
            toolCallMap.set(event.toolCallId, toolCall);
          }
          break;

        case 'tool-input-delta': {
          // Accumulate tool input
          const toolCall = toolCallMap.get(event.toolCallId);
          if (toolCall) {
            toolCall.inputText = (toolCall.inputText || '') + (event.inputTextDelta || '');
          }
          break;
        }

        case 'tool-input-end': {
          // Parse accumulated input as JSON args
          const finalToolCall = toolCallMap.get(event.toolCallId);
          if (finalToolCall && finalToolCall.inputText) {
            try {
              finalToolCall.args = JSON.parse(finalToolCall.inputText);
            } catch (e) {
              logger.debug(`Failed to parse tool args: ${e.message}`);
              // Keep inputText if parsing fails
            }
            // Always delete inputText after attempting to parse
            delete finalToolCall.inputText;
          }
          break;
        }

        case 'tool-result':
          // Tool execution result
          chunks.push({ type: 'tool-result', toolCallId: event.toolCallId, result: event.result });
          // Check if the result is an error
          if (event.result?.error || event.result?.status === 'error') {
            const toolCall = toolCallMap.get(event.toolCallId);
            toolErrors.push({
              toolCallId: event.toolCallId,
              toolName: toolCall?.name || 'unknown',
              error: event.result?.error || event.result?.message || 'Tool execution failed',
              result: event.result
            });
          }
          break;

        case 'tool-error': {
          // Explicit tool error event
          const erroredTool = toolCallMap.get(event.toolCallId);
          toolErrors.push({
            toolCallId: event.toolCallId,
            toolName: erroredTool?.name || event.toolName || 'unknown',
            error: event.error || event.message || 'Unknown error'
          });
          chunks.push({ type: 'tool-error', toolCallId: event.toolCallId, error: event.error });
          break;
        }

        case 'finish':
          chunks.push({ type: 'finish', reason: event.finishReason });
          break;
      }
    } catch (e) {
      logger.debug(`Failed to parse Vercel AI event: ${e.message}`);
    }
  }

  // Final pass: parse any remaining inputText as args
  for (const toolCall of toolCalls) {
    if (toolCall.inputText) {
      try {
        toolCall.args = JSON.parse(toolCall.inputText);
      } catch (e) {
        logger.debug(`Failed to parse tool args for ${toolCall.name}: ${e.message}`);
      }
      delete toolCall.inputText;
    }
  }

  return {
    text: text.trim(),
    toolCalls,
    toolErrors,
    chunks,
    metadata: {
      format: 'sse-vercel',
      totalChunks: chunks.length,
      totalTools: toolCalls.length,
      toolErrorCount: toolErrors.length
    }
  };
}
