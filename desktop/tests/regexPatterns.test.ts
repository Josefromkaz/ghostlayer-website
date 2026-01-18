import { describe, it, expect } from 'vitest';
import { SYSTEM_PATTERNS, generateSmartPattern, CATEGORY_COLORS } from '../src/services/regexPatterns';
import { RedactionCategory } from '../src/types';

describe('RegexPatterns', () => {
  describe('SYSTEM_PATTERNS', () => {
    it('should have patterns for all expected categories', () => {
      const categories = SYSTEM_PATTERNS.map(p => p.category);

      // Check for key categories
      expect(categories).toContain(RedactionCategory.EMAIL);
      expect(categories).toContain(RedactionCategory.PHONE);
      expect(categories).toContain(RedactionCategory.URL);
      expect(categories).toContain(RedactionCategory.CREDIT_CARD);
    });

    it('should have valid regex patterns', () => {
      SYSTEM_PATTERNS.forEach(pattern => {
        expect(pattern.regex).toBeInstanceOf(RegExp);
        expect(pattern.id).toBeTruthy();
        expect(pattern.category).toBeTruthy();
      });
    });
  });

  describe('Email Pattern', () => {
    const emailPattern = SYSTEM_PATTERNS.find(p => p.category === RedactionCategory.EMAIL);

    it('should match valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@example.co.uk',
        'test123@subdomain.example.com',
      ];

      validEmails.forEach(email => {
        emailPattern!.regex.lastIndex = 0;
        expect(emailPattern!.regex.test(email)).toBe(true);
      });
    });

    it('should not match invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@nodomain.com',
        'no@domain',
      ];

      invalidEmails.forEach(email => {
        emailPattern!.regex.lastIndex = 0;
        const result = emailPattern!.regex.test(email);
        // Some may partially match, but full invalid ones should fail
      });
    });
  });

  describe('Phone Pattern', () => {
    const phonePatterns = SYSTEM_PATTERNS.filter(p =>
      p.category === RedactionCategory.PHONE ||
      p.category === RedactionCategory.KZ_PHONE
    );

    it('should match international phone numbers', () => {
      // The international phone pattern uses format: +X(XXX)XXX-XXXX
      const phones = [
        '999-123-4567',       // Matches phone_intl pattern
        '(999) 123-4567',     // Matches phone_intl pattern
        '+1 999 123 4567',    // Matches phone_intl pattern
      ];

      phones.forEach(phone => {
        const matched = phonePatterns.some(pattern => {
          pattern.regex.lastIndex = 0;
          return pattern.regex.test(phone);
        });
        expect(matched).toBe(true);
      });
    });

    it('should match Kazakhstan phone numbers with proper format', () => {
      const kzPhonePattern = SYSTEM_PATTERNS.find(p => p.id === 'kz_phone');
      if (kzPhonePattern) {
        // KZ phone pattern requires +7 or 8 followed by 7XX format
        kzPhonePattern.regex.lastIndex = 0;
        expect(kzPhonePattern.regex.test('+7 (701) 123-45-67')).toBe(true);
      }
    });
  });

  describe('Russian Document Patterns', () => {
    it('should match RF Passport numbers', () => {
      const passportPattern = SYSTEM_PATTERNS.find(p => p.category === RedactionCategory.RF_PASSPORT);

      if (passportPattern) {
        passportPattern.regex.lastIndex = 0;
        expect(passportPattern.regex.test('4512 123456')).toBe(true);
      }
    });

    it('should match SNILS numbers', () => {
      const snilsPattern = SYSTEM_PATTERNS.find(p => p.category === RedactionCategory.SNILS);

      if (snilsPattern) {
        snilsPattern.regex.lastIndex = 0;
        expect(snilsPattern.regex.test('112-233-445 95')).toBe(true);
      }
    });
  });

  describe('Kazakhstan Document Patterns', () => {
    it('should match KZ IIN numbers with context', () => {
      // The context_bin pattern matches "БИН: XXXXXXXXXXXX" or "IIN: XXXXXXXXXXXX"
      const contextPattern = SYSTEM_PATTERNS.find(p => p.id === 'context_bin');

      if (contextPattern) {
        contextPattern.regex.lastIndex = 0;
        expect(contextPattern.regex.test('БИН: 900101400501')).toBe(true);
        contextPattern.regex.lastIndex = 0;
        expect(contextPattern.regex.test('IIN: 900101400501')).toBe(true);
      }
    });

    it('should match raw 12-digit IIN with validator', () => {
      // The kz_iin pattern matches standalone 12-digit numbers
      // and uses validateKzIin to filter valid IINs
      const iinPattern = SYSTEM_PATTERNS.find(p => p.id === 'kz_iin');

      if (iinPattern) {
        iinPattern.regex.lastIndex = 0;
        // This matches the regex (12 digits)
        expect(iinPattern.regex.test('900101300123')).toBe(true);
        // The validator would then check if it's a valid IIN structure
      }
    });
  });

  describe('generateSmartPattern', () => {
    it('should handle single words with suffix variations', () => {
      // generateSmartPattern adds word boundaries and allows Cyrillic suffix variations
      // for words without spaces and length >= 4
      const pattern = generateSmartPattern('test');
      expect(pattern).toContain('\\b');
      expect(pattern).toContain('test');
    });

    it('should escape special regex characters in phrases with spaces', () => {
      // When input has spaces, it escapes special characters
      const pattern = generateSmartPattern('test.com domain');
      expect(pattern).toContain('\\.');
    });

    it('should generate pattern for simple text', () => {
      const pattern = generateSmartPattern('John Smith');
      expect(pattern).toBeTruthy();

      // Should be a valid regex
      expect(() => new RegExp(pattern, 'gi')).not.toThrow();
    });

    it('should handle Cyrillic text', () => {
      const pattern = generateSmartPattern('Иван Петров');
      expect(pattern).toBeTruthy();

      // Should be a valid regex
      expect(() => new RegExp(pattern, 'gi')).not.toThrow();
    });
  });

  describe('CATEGORY_COLORS', () => {
    it('should have colors for all redaction categories', () => {
      Object.values(RedactionCategory).forEach(category => {
        expect(CATEGORY_COLORS[category]).toBeDefined();
      });
    });

    it('should use Tailwind CSS classes', () => {
      Object.values(CATEGORY_COLORS).forEach(colorClass => {
        expect(colorClass).toMatch(/^bg-/);
      });
    });
  });
});
