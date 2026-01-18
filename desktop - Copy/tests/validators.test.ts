import { describe, it, expect } from 'vitest';
import { luhnCheck, validateKzIin, validateRuInn } from '../src/services/validators';

describe('Validators', () => {
  describe('luhnCheck - Credit Card Validation', () => {
    it('should validate correct Visa card number', () => {
      expect(luhnCheck('4111111111111111')).toBe(true);
    });

    it('should validate correct MasterCard number', () => {
      expect(luhnCheck('5500000000000004')).toBe(true);
    });

    it('should reject invalid card number', () => {
      expect(luhnCheck('4111111111111112')).toBe(false);
    });

    it('should reject card number with less than 13 digits', () => {
      expect(luhnCheck('123456789012')).toBe(false);
    });

    it('should handle card number with spaces and dashes', () => {
      expect(luhnCheck('4111-1111-1111-1111')).toBe(true);
      expect(luhnCheck('4111 1111 1111 1111')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(luhnCheck('')).toBe(false);
    });
  });

  describe('validateKzIin - Kazakhstan IIN Validation', () => {
    it('should validate correct IIN with valid date', () => {
      // Format: YYMMDD + century digit (1-6) + 5 digits
      expect(validateKzIin('900101300123')).toBe(true); // Jan 1, 1990
    });

    it('should reject IIN with invalid month', () => {
      expect(validateKzIin('901301400123')).toBe(false); // Month 13
    });

    it('should reject IIN with invalid day', () => {
      expect(validateKzIin('900132400123')).toBe(false); // Day 32
    });

    it('should reject IIN with invalid century digit', () => {
      expect(validateKzIin('900101700123')).toBe(false); // Century 7 (invalid)
      expect(validateKzIin('900101000123')).toBe(false); // Century 0 (invalid)
    });

    it('should reject IIN with wrong length', () => {
      expect(validateKzIin('90010130012')).toBe(false);  // 11 digits
      expect(validateKzIin('9001013001234')).toBe(false); // 13 digits
    });

    it('should handle IIN with spaces', () => {
      expect(validateKzIin('900 101 300 123')).toBe(true);
    });
  });

  describe('validateRuInn - Russian INN Validation', () => {
    it('should validate correct 10-digit INN (organization)', () => {
      // Test INN with correct checksum
      expect(validateRuInn('7707083893')).toBe(true);
    });

    it('should reject 10-digit INN with invalid checksum', () => {
      expect(validateRuInn('7707083894')).toBe(false);
    });

    it('should validate correct 12-digit INN (individual)', () => {
      expect(validateRuInn('500100732259')).toBe(true);
    });

    it('should reject 12-digit INN with invalid checksum', () => {
      expect(validateRuInn('500100732250')).toBe(false);
    });

    it('should reject INN with wrong length', () => {
      expect(validateRuInn('123456789')).toBe(false);   // 9 digits
      expect(validateRuInn('12345678901')).toBe(false);  // 11 digits
      expect(validateRuInn('1234567890123')).toBe(false); // 13 digits
    });

    it('should handle INN with spaces', () => {
      expect(validateRuInn('77 0708 3893')).toBe(true);
    });
  });
});
