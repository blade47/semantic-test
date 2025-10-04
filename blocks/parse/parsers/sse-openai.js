import { logger } from '../../../src/utils/logger.js';

/**
 * Parse OpenAI SSE stream format
 * @param {string} body - Raw SSE stream body
 * @returns {Object} Parsed result with text, toolCalls, chunks, and metadata
 */
export function parseSSEOpenAI(body) {
  const lines = body.split(/\r?\n/);
  const chunks = [];
  let text = '';
  const toolCalls = [];

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.substring(6);
      if (data === '[DONE]') break;

      try {
        const parsed = JSON.parse(data);
        const choice = parsed.choices?.[0];

        if (choice?.delta?.content) {
          text += choice.delta.content;
          chunks.push({ type: 'text', content: choice.delta.content });
        }

        if (choice?.delta?.tool_calls) {
          for (const toolCall of choice.delta.tool_calls) {
            toolCalls.push({
              id: toolCall.id,
              name: toolCall.function?.name,
              args: JSON.parse(toolCall.function?.arguments || '{}')
            });
          }
        }
      } catch (e) {
        logger.debug(`Failed to parse OpenAI stream data: ${e.message}`);
      }
    }
  }

  return {
    text: text.trim(),
    toolCalls,
    chunks,
    metadata: {
      format: 'sse-openai',
      totalChunks: chunks.length,
      totalTools: toolCalls.length
    }
  };
}
