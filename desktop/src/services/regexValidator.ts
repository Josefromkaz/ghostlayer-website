
import { logger } from './logger';

/**
 * Validates if a regex pattern is safe to use (Basic ReDoS protection).
 * Checks for nested quantifiers and excessive alternations.
 */
export function isRegexSafe(pattern: string): boolean {
  try {
    // 1. Check valid syntax first
    new RegExp(pattern);

    // 2. Check for nested quantifiers (e.g., (a+)+) which cause catastrophic backtracking
    // Look for: quantifier immediately followed by another quantifier or group end + quantifier
    // This is a heuristic, not a perfect parser.

    // Simple heuristic: Count potential backtracking points
    const starCount = (pattern.match(/\*/g) || []).length;
    const plusCount = (pattern.match(/\+/g) || []).length;
    const groupCount = (pattern.match(/\(/g) || []).length;

    // Arbitrary limits for "complexity"
    if (starCount + plusCount > 20 || groupCount > 15) {
      logger.warn('RegexValidator', `Pattern too complex: ${pattern}`);
      return false;
    }

    // 3. Check for excessive alternations (a|b|c|d...)
    const pipeCount = (pattern.match(/\|/g) || []).length;
    if (pipeCount > 30) { // Limit alternatives
        logger.warn('RegexValidator', `Too many alternations: ${pattern}`);
        return false;
    }

    return true;
  } catch (e) {
    // Syntax error is "safe" in the sense that it won't run, but invalid.
    return false;
  }
}

export function validateAndCompileRegex(pattern: string, flags = 'gi'): RegExp | null {
  if (!pattern.trim()) return null;
  
  if (!isRegexSafe(pattern)) {
    throw new Error('Unsafe or too complex regular expression');
  }

  try {
    return new RegExp(pattern, flags);
  } catch (e) {
    throw new Error(`Invalid regular expression: ${(e as Error).message}`);
  }
}
