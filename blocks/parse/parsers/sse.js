/**
 * Generic SSE parser - extracts text from data lines
 * @param {string} body - Raw SSE stream body
 * @returns {Object} Parsed result with text, toolCalls, chunks, and metadata
 */
export function parseSSE(body) {
  const lines = body.split(/\r?\n/);
  const chunks = [];
  let text = '';

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.substring(6);
      if (data === '[DONE]') break;

      // Try to parse as JSON, otherwise treat as text
      try {
        const parsed = JSON.parse(data);
        chunks.push({ type: 'data', content: parsed });

        // Try to extract text from common fields
        if (parsed.text) text += parsed.text;
        else if (parsed.content) text += parsed.content;
        else if (parsed.message) text += parsed.message;
        else if (typeof parsed === 'string') text += parsed;
      } catch {
        // If not JSON, treat as plain text
        text += data;
        chunks.push({ type: 'text', content: data });
      }
    }
  }

  return {
    text: text.trim(),
    toolCalls: [],
    chunks,
    metadata: {
      format: 'sse',
      totalChunks: chunks.length,
      totalTools: 0
    }
  };
}
