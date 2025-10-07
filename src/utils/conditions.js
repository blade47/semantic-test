import { getPath } from './path.js';

/**
 * Unified condition evaluation system
 * Used by Loop, Assertions, and other blocks that need conditional logic
 */

/**
 * Evaluate a single condition operator
 * @param {any} actual - The actual value to check
 * @param {string} operator - The operator to use
 * @param {any} expected - The expected value
 * @returns {boolean} Whether the condition passes
 */
export function evaluateOperator(actual, operator, expected) {
  switch (operator) {
    // Equality
    case 'equals':
      return actual === expected;

    case 'notEquals':
      return actual !== expected;

    // Numeric comparisons
    case 'gt':
      return actual > expected;

    case 'gte':
      return actual >= expected;

    case 'lt':
      return actual < expected;

    case 'lte':
      return actual <= expected;

    // String/Array operations
    case 'contains':
      if (typeof actual === 'string') {
        return actual.includes(expected);
      }
      if (Array.isArray(actual)) {
        // For arrays, check if any element equals OR contains the expected value
        return actual.some(item => {
          if (typeof item === 'string' && typeof expected === 'string') {
            return item.includes(expected);
          }
          return item === expected;
        });
      }
      return false;

    case 'notContains':
      if (typeof actual === 'string' || Array.isArray(actual)) {
        return !actual.includes(expected);
      }
      return true;

    // Length checks
    case 'minLength':
      if (typeof actual === 'string' || Array.isArray(actual)) {
        return actual.length >= expected;
      }
      return false;

    case 'maxLength':
      if (typeof actual === 'string' || Array.isArray(actual)) {
        return actual.length <= expected;
      }
      return false;

    // Pattern matching
    case 'matches':
      if (typeof actual === 'string') {
        return new RegExp(expected).test(actual);
      }
      return false;

    case 'notMatches':
      if (typeof actual === 'string') {
        return !new RegExp(expected).test(actual);
      }
      return true;

    // Type checks
    case 'isNull':
      return actual === null;

    case 'isNotNull':
      return actual !== null;

    case 'isDefined':
      return actual !== undefined;

    case 'isUndefined':
      return actual === undefined;

    // Boolean
    case 'isTrue':
      return actual === true;

    case 'isFalse':
      return actual === false;

    // Array operations
    case 'isEmpty':
      if (typeof actual === 'string' || Array.isArray(actual)) {
        return actual.length === 0;
      }
      if (typeof actual === 'object' && actual !== null) {
        return Object.keys(actual).length === 0;
      }
      return false;

    case 'isNotEmpty':
      if (typeof actual === 'string' || Array.isArray(actual)) {
        return actual.length > 0;
      }
      if (typeof actual === 'object' && actual !== null) {
        return Object.keys(actual).length > 0;
      }
      return false;

    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

/**
 * Evaluate a condition object against data
 * @param {Object} data - The data object to evaluate against
 * @param {Object} condition - Condition config
 * @param {string} condition.path - Path to value in data (e.g., "response.status")
 * @param {string} condition.operator - Operator to use
 * @param {any} condition.value - Expected value (not needed for operators like isNull)
 * @returns {boolean} Whether the condition passes
 */
export function evaluateCondition(data, condition) {
  if (!condition) {
    throw new Error('Condition is required');
  }

  const { path, operator, value } = condition;

  if (!path) {
    throw new Error('Condition path is required');
  }

  if (!operator) {
    throw new Error('Condition operator is required');
  }

  // Get actual value from data
  const actual = getPath(data, path);

  // Some operators don't need a value
  const noValueOperators = [
    'isNull', 'isNotNull', 'isDefined', 'isUndefined',
    'isTrue', 'isFalse', 'isEmpty', 'isNotEmpty'
  ];

  if (!noValueOperators.includes(operator) && value === undefined) {
    throw new Error(`Operator '${operator}' requires a value`);
  }

  return evaluateOperator(actual, operator, value);
}

/**
 * Evaluate multiple conditions with AND logic
 * All conditions must pass
 * @param {Object} data - The data object to evaluate against
 * @param {Array<Object>} conditions - Array of condition objects
 * @returns {boolean} Whether all conditions pass
 */
export function evaluateConditions(data, conditions) {
  if (!Array.isArray(conditions)) {
    throw new Error('Conditions must be an array');
  }

  return conditions.every(condition => evaluateCondition(data, condition));
}

/**
 * Format a condition as a human-readable string
 * @param {Object} condition - Condition object
 * @returns {string} Human-readable condition string
 */
export function formatCondition(condition) {
  const { path, operator, value } = condition;

  const formats = {
    equals: `${path} === ${JSON.stringify(value)}`,
    notEquals: `${path} !== ${JSON.stringify(value)}`,
    gt: `${path} > ${value}`,
    gte: `${path} >= ${value}`,
    lt: `${path} < ${value}`,
    lte: `${path} <= ${value}`,
    contains: `${path} contains ${JSON.stringify(value)}`,
    notContains: `${path} does not contain ${JSON.stringify(value)}`,
    minLength: `${path}.length >= ${value}`,
    maxLength: `${path}.length <= ${value}`,
    matches: `${path} matches /${value}/`,
    notMatches: `${path} does not match /${value}/`,
    isNull: `${path} is null`,
    isNotNull: `${path} is not null`,
    isDefined: `${path} is defined`,
    isUndefined: `${path} is undefined`,
    isTrue: `${path} is true`,
    isFalse: `${path} is false`,
    isEmpty: `${path} is empty`,
    isNotEmpty: `${path} is not empty`
  };

  return formats[operator] || `${path} ${operator} ${JSON.stringify(value)}`;
}

/**
 * List all available operators
 * @returns {Array<Object>} List of operators with descriptions
 */
export function getAvailableOperators() {
  return [
    { name: 'equals', description: 'Value equals expected', requiresValue: true },
    { name: 'notEquals', description: 'Value does not equal expected', requiresValue: true },
    { name: 'gt', description: 'Value greater than expected', requiresValue: true },
    { name: 'gte', description: 'Value greater than or equal to expected', requiresValue: true },
    { name: 'lt', description: 'Value less than expected', requiresValue: true },
    { name: 'lte', description: 'Value less than or equal to expected', requiresValue: true },
    { name: 'contains', description: 'String/array contains expected value', requiresValue: true },
    { name: 'notContains', description: 'String/array does not contain expected value', requiresValue: true },
    { name: 'minLength', description: 'String/array length >= expected', requiresValue: true },
    { name: 'maxLength', description: 'String/array length <= expected', requiresValue: true },
    { name: 'matches', description: 'String matches regex pattern', requiresValue: true },
    { name: 'notMatches', description: 'String does not match regex pattern', requiresValue: true },
    { name: 'isNull', description: 'Value is null', requiresValue: false },
    { name: 'isNotNull', description: 'Value is not null', requiresValue: false },
    { name: 'isDefined', description: 'Value is defined (not undefined)', requiresValue: false },
    { name: 'isUndefined', description: 'Value is undefined', requiresValue: false },
    { name: 'isTrue', description: 'Value is boolean true', requiresValue: false },
    { name: 'isFalse', description: 'Value is boolean false', requiresValue: false },
    { name: 'isEmpty', description: 'String/array/object is empty', requiresValue: false },
    { name: 'isNotEmpty', description: 'String/array/object is not empty', requiresValue: false }
  ];
}
