import { v4 as uuidv4 } from 'uuid';
import { Match, RedactionCategory, CustomPattern, UserRule, WhitelistEntry } from '../types';
import { SYSTEM_PATTERNS, generateSmartPattern } from './regexPatterns';

// ===========================================
// False Positive Blacklist Configuration
// ===========================================
// These patterns are known false positives that should be skipped during redaction.
// Add new patterns here instead of hardcoding them in the redaction logic.
export const FALSE_POSITIVE_BLACKLIST: string[] = [
  'г. Дата',      // Russian: "city. Date" - common false positive
  'П. Дата',      // Russian: abbreviation + Date - common false positive
  'N/A',          // Common placeholder
  'TBD',          // Common placeholder
  'TODO',         // Code comment marker
];

// Escape string for use in RegExp
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\\]/g, '\\$&');
}

/**
 * Check if a match text contains any blacklisted false positive patterns
 */
function isBlacklistedFalsePositive(matchText: string): boolean {
  return FALSE_POSITIVE_BLACKLIST.some(pattern =>
    matchText.includes(pattern)
  );
}

export const runRedaction = (
  text: string,
  userRules: UserRule[],
  customPatterns: CustomPattern[] = [],
  whitelist: (string | WhitelistEntry)[] = [],
  whitelistedCategories: string[] = []
): Match[] => {
  let allMatches: Match[] = [];

  // 0. Process Whitelist Phrases (Highest Priority)
  // Support both old format (string[]) and new format (WhitelistEntry[])
  const whitelistPhrases: string[] = [];
  const whitelistCats: string[] = [...whitelistedCategories];

  whitelist.forEach(item => {
    if (typeof item === 'string') {
      // Old format - just a phrase
      whitelistPhrases.push(item);
    } else if (item.type === 'phrase') {
      whitelistPhrases.push(item.value);
    } else if (item.type === 'category') {
      whitelistCats.push(item.value);
    }
  });

  // Process phrase whitelist - use word boundaries for exact matching
  whitelistPhrases.forEach(phrase => {
    if (!phrase.trim()) return;
    // Use word boundaries to match exact phrases, not partial text
    const escapedPhrase = escapeRegExp(phrase);
    // For phrases with spaces, match the exact phrase
    // For single words, use word boundaries
    const pattern = phrase.includes(' ')
      ? escapedPhrase
      : `\\b${escapedPhrase}\\b`;
    try {
      const regex = new RegExp(pattern, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        allMatches.push({
          id: uuidv4(),
          text: match[0],
          start: match.index,
          end: match.index + match[0].length,
          category: RedactionCategory.WHITELIST,
          isRedacted: false,
        });
      }
    } catch (e) {
      console.warn("Invalid whitelist pattern:", phrase, e);
    }
  });

  // 1. Process User Rules (Memory)
  userRules
    .filter(rule => rule.enabled !== false) // Only enabled rules
    .forEach((rule) => {
        if (!rule.text.trim()) return;
        
        // Генерируем "умный" паттерн из сохраненного слова/фразы
        const pattern = generateSmartPattern(rule.text);
        
        try {
            const regex = new RegExp(pattern, 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
            allMatches.push({
                id: uuidv4(),
                text: match[0],
                start: match.index,
                end: match.index + match[0].length,
                category: rule.category || RedactionCategory.USER_MEMORY,
                isRedacted: true,
            });
            }
        } catch(e) {
            // Fallback: если что-то пошло не так, ищем как точную фразу
            console.warn("Regex generation failed for:", rule.text, e);
        }
  });

  // 2. Process Custom Patterns
  customPatterns
    .filter(p => p.active)
    .forEach(pattern => {
        if (!pattern.regex.trim()) return;
        try {
        const regex = new RegExp(pattern.regex, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
            allMatches.push({
            id: uuidv4(),
            text: match[0],
            start: match.index,
            end: match.index + match[0].length,
            category: RedactionCategory.CUSTOM,
            isRedacted: true,
            ruleId: pattern.id
            });
        }
        } catch (e) {
        console.warn(`Invalid regex in custom pattern ${pattern.name}:`, e);
        }
  });

  // 3. Process System Patterns
  SYSTEM_PATTERNS.forEach((pattern) => {
    // Skip entire category if it's whitelisted
    if (whitelistCats.includes(pattern.category)) {
      return;
    }

    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const matchText = match[0];

      // Skip known false positives (configurable blacklist)
      if (isBlacklistedFalsePositive(matchText)) {
        continue;
      }

      // Validate if a validator exists
      if (pattern.validator && !pattern.validator(matchText)) {
        continue;
      }

      allMatches.push({
        id: uuidv4(),
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        category: pattern.category,
        isRedacted: true,
        ruleId: pattern.id,
      });
    }
  });

  // 4. Resolve Overlaps
  // First, collect all whitelist ranges (these are "protected" zones)
  const whitelistRanges: Array<{start: number, end: number}> = [];
  allMatches
    .filter(m => m.category === RedactionCategory.WHITELIST)
    .forEach(m => whitelistRanges.push({ start: m.start, end: m.end }));

  // Helper to check if a match is FULLY CONTAINED within any whitelist range
  // A match is blocked only if it's completely inside a whitelist range
  // This allows longer matches that extend beyond whitelist to still work
  const isFullyContainedInWhitelist = (match: Match): boolean => {
    for (const range of whitelistRanges) {
      // Match is fully contained if whitelist covers it entirely
      if (match.start >= range.start && match.end <= range.end) {
        return true;
      }
    }
    return false;
  };

  // Filter out whitelist matches and matches fully contained in whitelist
  const nonWhitelistMatches = allMatches.filter(m => {
    if (m.category === RedactionCategory.WHITELIST) return false;
    // Skip matches that are FULLY CONTAINED within whitelist ranges
    // Matches that extend beyond whitelist are allowed
    if (isFullyContainedInWhitelist(m)) return false;
    return true;
  });

  // Sort remaining matches by length (longer first), then by position
  nonWhitelistMatches.sort((a, b) => {
    const lenDiff = (b.end - b.start) - (a.end - a.start);
    if (lenDiff !== 0) return lenDiff;
    return a.start - b.start;
  });

  const finalMatches: Match[] = [];
  const occupiedIndices = new Set<number>();

  for (const match of nonWhitelistMatches) {
    let isClean = true;
    for (let i = match.start; i < match.end; i++) {
      if (occupiedIndices.has(i)) {
        isClean = false;
        break;
      }
    }

    if (isClean) {
      finalMatches.push(match);
      for (let i = match.start; i < match.end; i++) {
        occupiedIndices.add(i);
      }
    }
  }

  finalMatches.sort((a, b) => a.start - b.start);

  // 5. Generate Unique IDs (Post-processing)
  const categoryCounters: Record<string, number> = {};
  const entityMap: Record<string, string> = {}; 

  return finalMatches.map(match => {
    if (!match.isRedacted) return match;

    const key = `${match.text.toLowerCase()}|${match.category}`;
    
    if (entityMap[key]) {
      return { ...match, replacementTag: entityMap[key] };
    }

    if (!categoryCounters[match.category]) {
      categoryCounters[match.category] = 0;
    }
    categoryCounters[match.category]++;
    
    const index = categoryCounters[match.category];
    const tag = `[${match.category}_${index}]`;
    
    entityMap[key] = tag;
    return { ...match, replacementTag: tag };
  });
};

// Helper to restore text from redacted version using match mapping
export function restoreText(redactedText: string, matches: Match[]): string {
  let restored = redactedText;

  // Find all tags: [CATEGORY_INDEX]
  const tagRegex = /[[A-Z_]+_\d+]/g;

  // Create a map of Tag -> Original Text
  const tagMap = new Map<string, string>();
  matches.forEach(m => {
    if (m.isRedacted && m.replacementTag) {
      tagMap.set(m.replacementTag, m.text);
    }
  });

  // Replace all known tags
  restored = restored.replace(tagRegex, (fullMatch) => {
    return tagMap.get(fullMatch) || fullMatch;
  });

  return restored;
}