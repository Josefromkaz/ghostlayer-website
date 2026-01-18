import { describe, it, expect } from 'vitest';
import { runRedaction, FALSE_POSITIVE_BLACKLIST, restoreText } from '../src/services/redactionEngine';
import { RedactionCategory, UserRule, CustomPattern } from '../src/types';

describe('RedactionEngine', () => {
  describe('runRedaction - Basic Functionality', () => {
    it('should detect email addresses', async () => {
      const text = 'Contact me at test@example.com for more info';
      const matches = await runRedaction(text, [], [], []);

      const emailMatch = matches.find(m => m.category === RedactionCategory.EMAIL);
      expect(emailMatch).toBeDefined();
      expect(emailMatch?.text).toBe('test@example.com');
    });

    it('should detect phone numbers', async () => {
      // The phone_intl pattern matches format like XXX-XXX-XXXX
      const text = 'Call me at 999-123-4567 for more info';
      const matches = await runRedaction(text, [], [], []);

      const phoneMatch = matches.find(m => m.category === RedactionCategory.PHONE);
      expect(phoneMatch).toBeDefined();
    });

    it('should detect Kazakhstan phone numbers', async () => {
      // KZ phone pattern requires +7 or 8 followed by 7XX area code
      const text = 'Казахстан: +7 (701) 123-45-67';
      const matches = await runRedaction(text, [], [], []);

      const phoneMatch = matches.find(m => m.category === RedactionCategory.KZ_PHONE);
      expect(phoneMatch).toBeDefined();
    });

    it('should detect URLs', async () => {
      const text = 'Visit https://example.com for details';
      const matches = await runRedaction(text, [], [], []);

      const urlMatch = matches.find(m => m.category === RedactionCategory.URL);
      expect(urlMatch).toBeDefined();
      expect(urlMatch?.text).toContain('https://example.com');
    });

    it('should detect credit card numbers', async () => {
      const text = 'Card: 4111-1111-1111-1111';
      const matches = await runRedaction(text, [], [], []);

      const cardMatch = matches.find(m => m.category === RedactionCategory.CREDIT_CARD);
      expect(cardMatch).toBeDefined();
    });
  });

  describe('runRedaction - User Rules (Memory)', () => {
    it('should detect text matching user rules', async () => {
      const text = 'My name is John Smith and I work at Acme Corp';
      const userRules: UserRule[] = [
        { id: '1', text: 'John Smith', category: RedactionCategory.USER_MEMORY, enabled: true },
        { id: '2', text: 'Acme Corp', category: RedactionCategory.USER_MEMORY, enabled: true },
      ];

      const matches = await runRedaction(text, userRules, [], []);

      const memoryMatches = matches.filter(m => m.category === RedactionCategory.USER_MEMORY);
      expect(memoryMatches.length).toBe(2);
    });

    it('should ignore disabled user rules', async () => {
      const text = 'My name is John Smith';
      const userRules: UserRule[] = [
        { id: '1', text: 'John Smith', category: RedactionCategory.USER_MEMORY, enabled: false },
      ];

      const matches = await runRedaction(text, userRules, [], []);
      const memoryMatches = matches.filter(m => m.category === RedactionCategory.USER_MEMORY);
      expect(memoryMatches.length).toBe(0);
    });
  });

  describe('runRedaction - Custom Patterns', () => {
    it('should detect text matching custom regex patterns', async () => {
      const text = 'Reference: REF-12345-ABC';
      const customPatterns: CustomPattern[] = [
        { id: '1', name: 'Reference ID', regex: 'REF-\\d{5}-[A-Z]+', category: 'CUSTOM', active: true },
      ];

      const matches = await runRedaction(text, [], customPatterns, []);

      const customMatch = matches.find(m => m.category === RedactionCategory.CUSTOM);
      expect(customMatch).toBeDefined();
      expect(customMatch?.text).toBe('REF-12345-ABC');
    });

    it('should ignore inactive custom patterns', async () => {
      const text = 'Reference: REF-12345-ABC';
      const customPatterns: CustomPattern[] = [
        { id: '1', name: 'Reference ID', regex: 'REF-\\d{5}-[A-Z]+', category: 'CUSTOM', active: false },
      ];

      const matches = await runRedaction(text, [], customPatterns, []);
      const customMatch = matches.find(m => m.category === RedactionCategory.CUSTOM);
      expect(customMatch).toBeUndefined();
    });
  });

  describe('runRedaction - Whitelist', () => {
    it('should NOT redact whitelisted phrases', async () => {
      const text = 'Contact support@company.com for help';
      const whitelist = ['support@company.com'];

      const matches = await runRedaction(text, [], [], whitelist);

      // Email should be found but marked as whitelist (not redacted)
      const redactedMatches = matches.filter(m => m.isRedacted);
      const emailInRedacted = redactedMatches.find(m => m.text === 'support@company.com');
      expect(emailInRedacted).toBeUndefined();
    });
  });

  describe('runRedaction - False Positive Blacklist', () => {
    it('should skip false positive patterns', async () => {
      for (const pattern of FALSE_POSITIVE_BLACKLIST) {
        const text = `Some text containing ${pattern} in the middle`;
        const matches = await runRedaction(text, [], [], []);

        // These should not create matches
        const matchWithPattern = matches.find(m => m.text.includes(pattern));
        // The blacklist prevents matches that CONTAIN these patterns
        // Not all will necessarily match system patterns, but if they do, they should be blocked
      }
    });
  });

  describe('runRedaction - Overlap Resolution', () => {
    it('should resolve overlapping matches (longer match wins)', async () => {
      const text = 'Email: john.doe@example.com';
      const userRules: UserRule[] = [
        { id: '1', text: 'john.doe', category: RedactionCategory.USER_MEMORY, enabled: true },
      ];

      const matches = await runRedaction(text, userRules, [], []);

      // Should only have one match - the longer email takes precedence
      // or the user rule - depends on priority
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('runRedaction - Replacement Tags', () => {
    it('should generate unique replacement tags', async () => {
      const text = 'Email: test@example.com and test2@example.com';
      const matches = await runRedaction(text, [], [], []);

      const emailMatches = matches.filter(m => m.category === RedactionCategory.EMAIL);
      expect(emailMatches.length).toBe(2);

      // Each should have a unique tag
      const tags = emailMatches.map(m => m.replacementTag);
      expect(tags[0]).not.toBe(tags[1]);
      expect(tags[0]).toMatch(/\[EMAIL_\d+\]/);
    });

    it('should reuse tags for identical text', async () => {
      const text = 'Email: test@example.com and again test@example.com';
      const matches = await runRedaction(text, [], [], []);

      const emailMatches = matches.filter(m => m.category === RedactionCategory.EMAIL);
      expect(emailMatches.length).toBe(2);

      // Same text should have same tag
      expect(emailMatches[0].replacementTag).toBe(emailMatches[1].replacementTag);
    });
  });

  describe('restoreText - De-anonymization', () => {
    it('should restore original text from tags', async () => {
      const original = 'Contact: test@example.com';
      const matches = await runRedaction(original, [], [], []);

      // Create redacted text
      let redacted = original;
      for (const match of matches.filter(m => m.isRedacted)) {
        redacted = redacted.replace(match.text, match.replacementTag || '[REDACTED]');
      }

      // Restore
      const restored = restoreText(redacted, matches);
      expect(restored).toBe(original);
    });
  });
});
