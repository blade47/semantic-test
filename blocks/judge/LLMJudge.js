import { Block } from '../../src/core/Block.js';
import { logger } from '../../src/utils/logger.js';
import OpenAI from 'openai';

/**
 * LLMJudge - Uses an LLM to evaluate responses
 */
export class LLMJudge extends Block {
  static get inputs() {
    return {
      required: ['text'],
      optional: ['toolCalls', 'expected', 'history']
    };
  }

  static get outputs() {
    return {
      produces: ['score', 'reasoning', 'shouldContinue', 'nextPrompt']
    };
  }

  constructor(config) {
    super(config);

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY
    });

    this.model = config.model || 'gpt-4o-mini';
  }

  async process(inputs, _context) {
    // Check for API key
    const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        score: 0,
        reasoning: 'OpenAI API key not configured',
        shouldContinue: false,
        error: 'OPENAI_API_KEY environment variable is required'
      };
    }

    const { text, toolCalls = [], expected = {}, history = [] } = inputs;

    // Build evaluation prompt
    const prompt = this.buildEvaluationPrompt(text, toolCalls, expected, history);

    try {
      // Call LLM for evaluation
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert test evaluator. Evaluate AI responses for correctness, completeness, and quality. Focus on SEMANTIC MEANING rather than exact word matching. For example, "2:00 PM", "2 PM", "14:00", and "two in the afternoon" all mean the same thing. Respond in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content);

      return {
        score: result.score || 0,
        reasoning: result.reasoning || 'No reasoning provided',
        shouldContinue: result.shouldContinue || false,
        nextPrompt: result.nextPrompt || null,
        details: result.details || {}
      };
    } catch (error) {
      logger.error('LLM Judge error', error);
      return {
        score: 0,
        reasoning: `Evaluation failed: ${error.message}`,
        shouldContinue: false,
        error: error.message
      };
    }
  }

  buildEvaluationPrompt(text, toolCalls, expected, history) {
    const criteria = this.config.criteria || {};

    // Add current date and time context
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    let prompt = `CURRENT DATE AND TIME CONTEXT:\n`;
    prompt += `Today is ${dateStr}\n`;
    prompt += `Current time is ${timeStr}\n`;
    prompt += `When the AI mentions "tomorrow", it means ${new Date(now.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}\n`;
    prompt += `When the AI mentions "next week", it means the week starting ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n\n`;

    prompt += `Evaluate this AI response:\n\n`;
    prompt += `Response Text: ${text}\n\n`;

    if (toolCalls.length > 0) {
      prompt += `Tools Used: ${toolCalls.map(t => t.name).join(', ')}\n\n`;
    }

    // Only process expectedBehavior - the single source of truth
    if (expected?.expectedBehavior) {
      prompt += `Expected Behavior:\n${expected.expectedBehavior}\n\n`;
      prompt += `IMPORTANT: Evaluate if the response semantically matches this expected behavior.\n`;
      prompt += `Focus on MEANING and INTENT, not exact word matching.\n\n`;
    }

    if (history.length > 0) {
      prompt += `Conversation History:\n`;
      for (const msg of history.slice(-5)) { // Last 5 messages
        prompt += `${msg.role}: ${msg.content}\n`;
      }
      prompt += '\n';
    }

    prompt += `Evaluation Approach:\n`;
    prompt += `1. Check if the response semantically matches the expected behavior\n`;
    prompt += `2. Consider synonyms, paraphrases, and different formats as equivalent\n`;
    prompt += `3. Evaluate based on meaning and intent, not exact wording\n`;
    prompt += `4. Score based on how well the behavior requirements are met\n\n`;

    prompt += `Scoring Weights:\n`;
    prompt += `- Accuracy: ${criteria.accuracy || 0.4}\n`;
    prompt += `- Completeness: ${criteria.completeness || 0.3}\n`;
    prompt += `- Relevance: ${criteria.relevance || 0.3}\n\n`;

    if (this.config.continueConversation) {
      prompt += `This is part of an ongoing test conversation.\n`;
      prompt += `Determine if the conversation should continue.\n`;
      prompt += `If yes, generate the next user prompt.\n\n`;
    }

    prompt += `Return a JSON object with:\n`;
    prompt += `- score: number between 0 and 1 (based on how well behavior matches)\n`;
    prompt += `- reasoning: string explaining what was found and why the score was given\n`;
    prompt += `- shouldContinue: boolean (for multi-turn conversations)\n`;
    prompt += `- nextPrompt: string or null (next user message if continuing)\n`;
    prompt += `- details: object with any specific observations\n`;

    return prompt;
  }
}
