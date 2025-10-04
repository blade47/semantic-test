/**
 * Constants for the SemanticTest framework
 * Following DRY principle - centralizing magic values
 */

// Score multipliers for validation failures
export const SCORE_MULTIPLIERS = Object.freeze({
  MISSING_CONTENT: 0.5, // Used when expected content is missing
  FORBIDDEN_CONTENT: 0.5, // Used when forbidden content is found
  PATTERN_MISMATCH: 0.7, // Used when text doesn't match regex pattern
  LENGTH_TOO_SHORT: 0.8, // Used when text is shorter than required
  LENGTH_TOO_LONG: 0.9, // Used when text is longer than allowed
  // Tool validation multipliers
  FORBIDDEN_TOOL: 0.5, // Used when forbidden tool is called
  TOO_FEW_TOOLS: 0.8, // Used when fewer tools than required
  TOO_MANY_TOOLS: 0.9, // Used when more tools than allowed
  INCORRECT_ORDER: 0.7, // Used when tools are in wrong order
  ARG_MISMATCH: 0.9 // Used when tool arguments don't match expected
});

// Default limits
export const LIMITS = Object.freeze({
  MAX_LOOP_ITERATIONS: 10, // Default max iterations for Loop block
  STRING_PREVIEW_LENGTH: 100 // Max length for string previews in debug output
});

// Separator characters for output formatting
export const SEPARATORS = Object.freeze({
  THIN: '─',
  THICK: '═',
  DOTTED: '·',
  LENGTH: 60
});
