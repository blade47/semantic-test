import { Block } from '../../src/core/Block.js';
import { measureTime } from '../../src/utils/timing.js';
import { logger } from '../../src/utils/logger.js';

/**
 * HttpRequest - Makes HTTP requests
 */
export class HttpRequest extends Block {
  static get inputs() {
    return {
      required: ['url', 'method'],
      optional: ['headers', 'body', 'timeout', 'query']
    };
  }

  static get outputs() {
    return {
      produces: ['status', 'headers', 'body', 'duration', 'url']
    };
  }

  async process(inputs, _context) {
    const { url, method, headers = {}, body, timeout = 30000, query } = inputs;

    // Build URL with query params
    let urlObj;
    try {
      urlObj = new URL(url);
      if (query) {
        for (const [key, value] of Object.entries(query)) {
          urlObj.searchParams.append(key, value);
        }
      }
    } catch (error) {
      return {
        error: error.message,
        status: 0,
        duration: 0,
        url
      };
    }

    // Prepare request options
    const options = {
      method,
      headers: { ...headers },
      signal: AbortSignal.timeout(timeout)
    };

    // Add body if present
    if (body) {
      if (typeof body === 'string') {
        options.body = body;
      } else {
        // Only set Content-Type for JSON if not already set
        if (!headers['Content-Type'] && !headers['content-type']) {
          options.headers['Content-Type'] = 'application/json';
        }
        options.body = JSON.stringify(body);
      }
    }

    // Log request details
    logger.debug(`HTTP ${method} ${urlObj.toString()}`);
    logger.debug('Request headers:', options.headers);
    if (body) {
      logger.debug('Request body:', typeof body === 'string' ? body : body);
    }

    // Make request
    const { result: response, duration, error } = await measureTime(() =>
      fetch(urlObj.toString(), options)
    );

    if (error) {
      return {
        error: error.message,
        status: 0,
        duration,
        url: urlObj.toString()
      };
    }

    // Get response body as text (can be parsed later)
    const responseBody = await response.text();

    // Log response details
    logger.debug(`Response status: ${response.status}`);
    logger.debug('Response headers:', Object.fromEntries(response.headers.entries()));
    if (responseBody) {
      // Truncate very long responses for logging
      const logBody = responseBody.length > 1000 ?
        `${responseBody.substring(0, 1000)}... [truncated]` :
        responseBody;
      logger.debug('Response body:', logBody);
    }
    logger.debug(`Request completed in ${duration}ms`);

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
      duration,
      url: urlObj.toString()
    };
  }
}
